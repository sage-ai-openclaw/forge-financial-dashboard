import crypto from 'crypto';
import { getDatabase } from '../database';
import { Webhook, WebhookEvent, WebhookPayload } from '../types/external';

export async function getActiveWebhooks(event: WebhookEvent): Promise<Webhook[]> {
  const db = await getDatabase();
  const rows = await db.all(
    `SELECT * FROM webhooks WHERE is_active = 1 AND (events = '*' OR events LIKE ?)`,
    `%${event}%`
  );

  return rows.map(row => ({
    id: row.id,
    url: row.url,
    events: row.events.split(','),
    secret: row.secret,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  }));
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function triggerWebhook(
  event: WebhookEvent,
  data: any
): Promise<void> {
  const webhooks = await getActiveWebhooks(event);
  
  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);

  // Send webhooks asynchronously (don't wait)
  for (const webhook of webhooks) {
    sendWebhook(webhook, event, payloadString).catch(err => {
      console.error(`Webhook delivery failed for ${webhook.url}:`, err);
    });
  }
}

async function sendWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  payloadString: string
): Promise<void> {
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'User-Agent': 'FinancialDashboard-Webhook/1.0',
      },
      body: payloadString,
    });

    const responseBody = await response.text();

    // Log delivery
    const db = await getDatabase();
    await db.run(
      `INSERT INTO webhook_deliveries 
       (webhook_id, event, payload, response_status, response_body, success) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      webhook.id,
      event,
      payloadString,
      response.status,
      responseBody.substring(0, 1000), // Limit stored response
      response.ok ? 1 : 0
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
  } catch (error) {
    // Log failed delivery
    const db = await getDatabase();
    await db.run(
      `INSERT INTO webhook_deliveries 
       (webhook_id, event, payload, response_status, response_body, success) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      webhook.id,
      event,
      payloadString,
      0,
      error instanceof Error ? error.message : 'Unknown error',
      0
    );
    throw error;
  }
}
