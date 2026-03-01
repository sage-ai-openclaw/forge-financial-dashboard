import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { getDatabase } from '../src/database';

describe('External API (US6)', () => {
  let apiKey: string;

  beforeAll(async () => {
    // Get the default development API key
    const db = await getDatabase();
    const row = await db.get('SELECT key FROM api_keys WHERE is_active = 1 LIMIT 1');
    apiKey = row?.key || 'fd_dev_test_key_12345678901234567890123456789012';
    
    if (!row) {
      await db.run(
        'INSERT INTO api_keys (key, name, permissions) VALUES (?, ?, ?)',
        apiKey, 'Test Key', 'read,write,webhooks'
      );
    }
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app).get('/api/external/transactions');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/external/transactions')
        .set('X-API-Key', 'invalid_key');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should allow requests with valid API key', async () => {
      const response = await request(app)
        .get('/api/external/transactions')
        .set('X-API-Key', apiKey);
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/external/transactions')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/external/transactions')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('GET /api/external/transactions', () => {
    it('should return empty array when no transactions', async () => {
      const response = await request(app)
        .get('/api/external/transactions')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.limit).toBeDefined();
      expect(response.body.meta.offset).toBeDefined();
    });

    it('should return transactions with metadata', async () => {
      // Create a transaction first
      await request(app)
        .post('/api/transactions')
        .send({
          amount: 50,
          description: 'Test transaction',
          date: '2026-03-01',
          type: 'expense',
        });

      const response = await request(app)
        .get('/api/external/transactions')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].amount).toBe(50);
      expect(response.body.data[0].description).toBe('Test transaction');
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/external/transactions?type=expense')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.data.every((t: any) => t.type === 'expense')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/external/transactions?limit=5&offset=0')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.meta.offset).toBe(0);
    });
  });

  describe('POST /api/external/transactions', () => {
    it('should create a transaction via external API', async () => {
      const response = await request(app)
        .post('/api/external/transactions')
        .set('X-API-Key', apiKey)
        .send({
          amount: 100,
          description: 'External API transaction',
          date: '2026-03-15',
          type: 'expense',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(100);
      expect(response.body.description).toBe('External API transaction');
      expect(response.body.type).toBe('expense');
      expect(response.body.id).toBeDefined();
    });

    it('should create transaction with category', async () => {
      // Create a category first
      const catResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'TestCategory', type: 'expense', color: '#ff0000' });

      const response = await request(app)
        .post('/api/external/transactions')
        .set('X-API-Key', apiKey)
        .send({
          amount: 75,
          description: 'Categorized transaction',
          date: '2026-03-15',
          type: 'expense',
          categoryId: catResponse.body.id,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.categoryId).toBe(catResponse.body.id);
      expect(response.body.categoryName).toBe('TestCategory');
    });

    it('should reject invalid transaction data', async () => {
      const response = await request(app)
        .post('/api/external/transactions')
        .set('X-API-Key', apiKey)
        .send({
          // Missing required fields
          description: 'Incomplete',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should require write permission', async () => {
      // Create a read-only API key
      const db = await getDatabase();
      const readOnlyKey = 'fd_readonly_' + Date.now();
      await db.run(
        'INSERT INTO api_keys (key, name, permissions) VALUES (?, ?, ?)',
        readOnlyKey, 'Read Only Key', 'read'
      );

      const response = await request(app)
        .post('/api/external/transactions')
        .set('X-API-Key', readOnlyKey)
        .send({
          amount: 100,
          description: 'Test',
          date: '2026-03-15',
          type: 'expense',
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('GET /api/external/categories', () => {
    it('should return categories list', async () => {
      const response = await request(app)
        .get('/api/external/categories')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include category details', async () => {
      const response = await request(app)
        .get('/api/external/categories')
        .set('X-API-Key', apiKey);
      
      if (response.body.data.length > 0) {
        const category = response.body.data[0];
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.type).toBeDefined();
        expect(category.color).toBeDefined();
      }
    });
  });

  describe('GET /api/external/budgets', () => {
    it('should return budgets list', async () => {
      const response = await request(app)
        .get('/api/external/budgets')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter budgets by month and year', async () => {
      const response = await request(app)
        .get('/api/external/budgets?month=03&year=2026')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      // All returned budgets should match the filter
      response.body.data.forEach((budget: any) => {
        expect(budget.month).toBe('03');
        expect(budget.year).toBe(2026);
      });
    });
  });

  describe('GET /api/external/summary/monthly', () => {
    beforeAll(async () => {
      // Create some test transactions
      const db = await getDatabase();
      await db.run(
        `INSERT INTO transactions (amount, description, date, type) VALUES (?, ?, ?, ?)`,
        3000, 'Salary', '2026-03-01', 'income'
      );
      await db.run(
        `INSERT INTO transactions (amount, description, date, type) VALUES (?, ?, ?, ?)`,
        200, 'Groceries', '2026-03-05', 'expense'
      );
      await db.run(
        `INSERT INTO transactions (amount, description, date, type) VALUES (?, ?, ?, ?)`,
        100, 'Transport', '2026-03-10', 'expense'
      );
    });

    it('should return monthly summary', async () => {
      const response = await request(app)
        .get('/api/external/summary/monthly?month=03&year=2026')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.month).toBe('03');
      expect(response.body.year).toBe(2026);
      expect(response.body.totalIncome).toBeDefined();
      expect(response.body.totalExpense).toBeDefined();
      expect(response.body.netAmount).toBeDefined();
      expect(response.body.categoryBreakdown).toBeDefined();
      expect(Array.isArray(response.body.categoryBreakdown)).toBe(true);
    });

    it('should calculate net amount correctly', async () => {
      const response = await request(app)
        .get('/api/external/summary/monthly?month=03&year=2026')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      const { totalIncome, totalExpense, netAmount } = response.body;
      expect(netAmount).toBe(totalIncome - totalExpense);
    });

    it('should default to current month/year when not specified', async () => {
      const response = await request(app)
        .get('/api/external/summary/monthly')
        .set('X-API-Key', apiKey);
      
      expect(response.status).toBe(200);
      expect(response.body.month).toBeDefined();
      expect(response.body.year).toBeDefined();
    });
  });

  describe('Webhooks', () => {
    describe('POST /api/external/webhooks', () => {
      it('should create a webhook', async () => {
        const response = await request(app)
          .post('/api/external/webhooks')
          .set('X-API-Key', apiKey)
          .send({
            url: 'https://example.com/webhook',
            events: ['transaction.created', 'transaction.updated'],
          });
        
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.url).toBe('https://example.com/webhook');
        expect(response.body.events).toEqual(['transaction.created', 'transaction.updated']);
        expect(response.body.secret).toBeDefined();
        expect(response.body.isActive).toBe(true);
      });

      it('should reject invalid webhook URL', async () => {
        const response = await request(app)
          .post('/api/external/webhooks')
          .set('X-API-Key', apiKey)
          .send({
            url: 'not-a-valid-url',
            events: ['transaction.created'],
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid input');
      });

      it('should require webhook permission', async () => {
        // Create a key without webhook permission
        const db = await getDatabase();
        const noWebhookKey = 'fd_nowebhook_' + Date.now();
        await db.run(
          'INSERT INTO api_keys (key, name, permissions) VALUES (?, ?, ?)',
          noWebhookKey, 'No Webhook Key', 'read,write'
        );

        const response = await request(app)
          .post('/api/external/webhooks')
          .set('X-API-Key', noWebhookKey)
          .send({
            url: 'https://example.com/webhook',
            events: ['transaction.created'],
          });
        
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Forbidden');
      });
    });

    describe('GET /api/external/webhooks', () => {
      it('should list webhooks', async () => {
        const response = await request(app)
          .get('/api/external/webhooks')
          .set('X-API-Key', apiKey);
        
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should not include secret in list response', async () => {
        const response = await request(app)
          .get('/api/external/webhooks')
          .set('X-API-Key', apiKey);
        
        if (response.body.data.length > 0) {
          const webhook = response.body.data[0];
          expect(webhook.secret).toBeUndefined();
        }
      });
    });

    describe('DELETE /api/external/webhooks/:id', () => {
      it('should delete a webhook', async () => {
        // Create a webhook first
        const createResponse = await request(app)
          .post('/api/external/webhooks')
          .set('X-API-Key', apiKey)
          .send({
            url: 'https://temp.example.com/webhook',
            events: ['transaction.created'],
          });

        const webhookId = createResponse.body.id;

        const response = await request(app)
          .delete(`/api/external/webhooks/${webhookId}`)
          .set('X-API-Key', apiKey);
        
        expect(response.status).toBe(204);
      });

      it('should return 404 for non-existent webhook', async () => {
        const response = await request(app)
          .delete('/api/external/webhooks/99999')
          .set('X-API-Key', apiKey);
        
        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/external/webhooks/:id/deliveries', () => {
      it('should return webhook delivery history', async () => {
        // Create a webhook first
        const createResponse = await request(app)
          .post('/api/external/webhooks')
          .set('X-API-Key', apiKey)
          .send({
            url: 'https://test.example.com/webhook',
            events: ['transaction.created'],
          });

        const webhookId = createResponse.body.id;

        const response = await request(app)
          .get(`/api/external/webhooks/${webhookId}/deliveries`)
          .set('X-API-Key', apiKey);
        
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Financial Dashboard API');
      expect(response.body.version).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.external).toBeDefined();
    });
  });
});
