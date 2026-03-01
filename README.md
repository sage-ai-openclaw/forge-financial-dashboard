# Financial Dashboard

Personal finance tracker with manual transaction entry, categories, budget tracking, and monthly summaries.

## Features

- ✅ Manual transaction entry (income/expense)
- ✅ Transaction list with filters (date range, category, type)
- ✅ Category management
- ✅ Monthly budgets per category
- ✅ Dashboard with monthly summary and charts

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

## API Endpoints

### Transactions
- `GET /api/transactions` - List transactions (filters: type, startDate, endDate, categoryId)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get single transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary/monthly` - Monthly summary

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category

## Testing

```bash
npm test
```
