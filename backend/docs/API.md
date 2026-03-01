# Financial Dashboard API Documentation

## Overview

The Financial Dashboard API provides programmatic access to manage transactions, categories, budgets, and receive real-time notifications via webhooks.

**Base URL:** `http://localhost:3002/api`

## Authentication

The External API requires API key authentication. Include your API key in the `X-API-Key` header with every request.

```
X-API-Key: your_api_key_here
```

### Default Development Key

On first startup, a default development API key is generated and printed to the console. Use this key for development and testing.

### Response Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (deleted) |
| 400 | Bad Request |
| 401 | Unauthorized (missing or invalid API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Rate Limiting

All external API endpoints are rate-limited to 100 requests per minute per API key. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets

---

## Endpoints

### Transactions

#### List Transactions

```
GET /api/external/transactions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Filter by start date (YYYY-MM-DD) |
| `endDate` | string | Filter by end date (YYYY-MM-DD) |
| `categoryId` | number | Filter by category ID |
| `type` | string | Filter by type: `income` or `expense` |
| `limit` | number | Maximum results (default: 100) |
| `offset` | number | Pagination offset |

**Example Request:**

```bash
curl -H "X-API-Key: your_api_key" \
  "http://localhost:3002/api/external/transactions?type=expense&limit=10"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "amount": 45.50,
      "description": "Grocery shopping",
      "date": "2026-03-01",
      "type": "expense",
      "categoryId": 3,
      "categoryName": "Food",
      "categoryColor": "#ef4444",
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

#### Create Transaction

```
POST /api/external/transactions
```

**Required Permissions:** `write`

**Request Body:**

```json
{
  "amount": 45.50,
  "description": "Grocery shopping",
  "date": "2026-03-01",
  "type": "expense",
  "categoryId": 3
}
```

**Example Request:**

```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"amount": 45.50, "description": "Grocery shopping", "date": "2026-03-01", "type": "expense"}' \
  http://localhost:3002/api/external/transactions
```

---

### Categories

#### List Categories

```
GET /api/external/categories
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Salary",
      "type": "income",
      "color": "#22c55e",
      "createdAt": "2026-03-01T10:00:00.000Z"
    },
    {
      "id": 3,
      "name": "Food",
      "type": "expense",
      "color": "#ef4444",
      "createdAt": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### Budgets

#### List Budgets

```
GET /api/external/budgets
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | string | Filter by month (MM) |
| `year` | number | Filter by year (YYYY) |

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "categoryId": 3,
      "categoryName": "Food",
      "categoryColor": "#ef4444",
      "amount": 500.00,
      "month": "03",
      "year": 2026,
      "createdAt": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### Summary

#### Monthly Summary

```
GET /api/external/summary/monthly
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | string | Month (MM) - defaults to current month |
| `year` | number | Year (YYYY) - defaults to current year |

**Example Response:**

```json
{
  "month": "03",
  "year": 2026,
  "totalIncome": 2500.00,
  "totalExpense": 650.00,
  "netAmount": 1850.00,
  "categoryBreakdown": [
    {
      "categoryId": 3,
      "categoryName": "Food",
      "categoryColor": "#ef4444",
      "amount": 400.00,
      "percentage": 62
    },
    {
      "categoryId": 4,
      "categoryName": "Transport",
      "categoryColor": "#f97316",
      "amount": 250.00,
      "percentage": 38
    }
  ]
}
```

---

## Webhooks

Webhooks allow your application to receive real-time notifications when events occur in the Financial Dashboard.

### Supported Events

| Event | Description |
|-------|-------------|
| `transaction.created` | New transaction added |
| `transaction.updated` | Transaction modified |
| `transaction.deleted` | Transaction removed |
| `category.created` | New category added |
| `category.updated` | Category modified |
| `category.deleted` | Category removed |
| `budget.created` | New budget added |
| `budget.updated` | Budget modified |
| `budget.deleted` | Budget removed |

### Creating a Webhook

```
POST /api/external/webhooks
```

**Required Permissions:** `webhooks`

**Request Body:**

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["transaction.created", "transaction.updated"]
}
```

**Example Response:**

```json
{
  "id": 1,
  "url": "https://your-app.com/webhook",
  "events": ["transaction.created", "transaction.updated"],
  "secret": "webhook_secret_used_for_verification",
  "isActive": true,
  "createdAt": "2026-03-01T10:00:00.000Z"
}
```

**Important:** The `secret` is only returned once on creation. Store it securely for webhook signature verification.

### Listing Webhooks

```
GET /api/external/webhooks
```

### Deleting a Webhook

```
DELETE /api/external/webhooks/:id
```

### Webhook Delivery History

```
GET /api/external/webhooks/:id/deliveries?limit=50
```

---

## Webhook Payloads

When an event occurs, we'll send a POST request to your webhook URL with the following payload structure:

```json
{
  "event": "transaction.created",
  "timestamp": "2026-03-01T10:30:00.000Z",
  "data": {
    "id": 1,
    "amount": 45.50,
    "description": "Grocery shopping",
    "date": "2026-03-01",
    "type": "expense",
    "categoryId": 3,
    "categoryName": "Food",
    "categoryColor": "#ef4444",
    "createdAt": "2026-03-01T10:30:00.000Z",
    "updatedAt": "2026-03-01T10:30:00.000Z"
  }
}
```

### Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | HMAC-SHA256 signature for verification |
| `X-Webhook-Event` | Event type that triggered the webhook |
| `User-Agent` | `FinancialDashboard-Webhook/1.0` |

### Signature Verification

To verify webhook authenticity, compute the HMAC-SHA256 signature of the payload using your webhook secret:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

// Usage
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  res.status(200).send('OK');
});
```

---

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for browser-based applications. Configure allowed origins using the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com
```

Default allowed origins for development:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `DB_PATH` | SQLite database file path | `./data/finance.db` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | See above |

---

## SDK Example

### JavaScript/TypeScript

```typescript
class FinancialDashboardClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'http://localhost:3002') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  // Transactions
  async getTransactions(filters?: Record<string, string>) {
    const query = filters ? '?' + new URLSearchParams(filters) : '';
    return this.request(`/api/external/transactions${query}`);
  }

  async createTransaction(data: {
    amount: number;
    description: string;
    date: string;
    type: 'income' | 'expense';
    categoryId?: number;
  }) {
    return this.request('/api/external/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Categories
  async getCategories() {
    return this.request('/api/external/categories');
  }

  // Monthly Summary
  async getMonthlySummary(month?: string, year?: number) {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year.toString());
    return this.request(`/api/external/summary/monthly?${params}`);
  }

  // Webhooks
  async createWebhook(url: string, events: string[]) {
    return this.request('/api/external/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    });
  }

  async getWebhooks() {
    return this.request('/api/external/webhooks');
  }

  async deleteWebhook(id: number) {
    return this.request(`/api/external/webhooks/${id}`, {
      method: 'DELETE',
    });
  }
}

// Usage
const client = new FinancialDashboardClient('your_api_key');
const transactions = await client.getTransactions({ type: 'expense', limit: '10' });
```

---

## Support

For issues or questions, please refer to the project repository at `https://github.com/sage-ai-openclaw/forge-financial-dashboard`.
