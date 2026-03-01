# Financial Dashboard

Personal finance tracker with manual transaction entry, categories, budget tracking, monthly summaries, and REST API for external integration.

## Features

- ✅ Manual transaction entry (income/expense)
- ✅ Transaction list with filters (date range, category, type)
- ✅ Category management
- ✅ Monthly budgets per category
- ✅ Dashboard with monthly summary and charts
- ✅ **REST API for external integration** (with API key auth, rate limiting, webhooks)

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, SQLite
- **Frontend:** React, TypeScript, Vite
- **Testing:** Vitest

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or start individually
npm run dev:backend  # API on http://localhost:3002
npm run dev:frontend # App on http://localhost:3000
```

## API Documentation

### Internal API

Standard REST endpoints for the frontend application:

#### Transactions
- `GET /api/transactions` - List transactions (filters: type, startDate, endDate, categoryId)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get single transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary/monthly` - Monthly summary

#### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category

#### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `DELETE /api/budgets/:id` - Delete budget

### External API

The External API allows third-party integrations with API key authentication, rate limiting, and webhook support.

**Base URL:** `http://localhost:3002/api/external`

#### Authentication

All external API requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key" http://localhost:3002/api/external/transactions
```

On first startup, a default development API key is generated and printed to the console.

#### Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/external/transactions` | List transactions | `read` |
| POST | `/api/external/transactions` | Create transaction | `write` |
| GET | `/api/external/categories` | List categories | `read` |
| GET | `/api/external/budgets` | List budgets | `read` |
| GET | `/api/external/summary/monthly` | Monthly summary | `read` |
| GET | `/api/external/webhooks` | List webhooks | `webhooks` |
| POST | `/api/external/webhooks` | Create webhook | `webhooks` |
| DELETE | `/api/external/webhooks/:id` | Delete webhook | `webhooks` |
| GET | `/api/external/webhooks/:id/deliveries` | Webhook delivery history | `webhooks` |

#### Rate Limiting

External API endpoints are rate-limited to 100 requests per minute per API key. Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the limit resets

#### Webhooks

Subscribe to real-time events by creating webhooks:

```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.com/webhook", "events": ["transaction.created"]}' \
  http://localhost:3002/api/external/webhooks
```

**Supported Events:**
- `transaction.created`, `transaction.updated`, `transaction.deleted`
- `category.created`, `category.updated`, `category.deleted`
- `budget.created`, `budget.updated`, `budget.deleted`

**Webhook Payload:**

```json
{
  "event": "transaction.created",
  "timestamp": "2026-03-01T10:30:00.000Z",
  "data": { ...transaction data... }
}
```

**Signature Verification:**

Webhooks include a signature header for verification:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === `sha256=${expected}`;
}
```

#### CORS

Configure allowed origins using the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com npm run dev:backend
```

For full API documentation, see [backend/docs/API.md](./backend/docs/API.md).

## Testing

```bash
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `DB_PATH` | SQLite database file path | `./data/finance.db` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:3000,http://localhost:5173` |
