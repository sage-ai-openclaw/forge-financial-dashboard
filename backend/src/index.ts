import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import budgetsRouter from './routes/budgets';
import externalRouter from './routes/external';
import { apiKeyAuth } from './middleware/auth';

const app = express();

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Webhook-Signature'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);

// External API routes (require API key authentication)
app.use('/api/external', apiKeyAuth, externalRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['transactions', 'categories', 'budgets', 'external-api', 'webhooks'],
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Financial Dashboard API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      internal: {
        transactions: '/api/transactions',
        categories: '/api/categories',
        budgets: '/api/budgets',
      },
      external: {
        base: '/api/external',
        authentication: 'X-API-Key header required',
        endpoints: [
          { method: 'GET', path: '/api/external/transactions', description: 'List transactions' },
          { method: 'POST', path: '/api/external/transactions', description: 'Create transaction' },
          { method: 'GET', path: '/api/external/categories', description: 'List categories' },
          { method: 'GET', path: '/api/external/budgets', description: 'List budgets' },
          { method: 'GET', path: '/api/external/summary/monthly', description: 'Monthly summary' },
          { method: 'GET', path: '/api/external/webhooks', description: 'List webhooks' },
          { method: 'POST', path: '/api/external/webhooks', description: 'Create webhook' },
          { method: 'DELETE', path: '/api/external/webhooks/:id', description: 'Delete webhook' },
        ],
      },
    },
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start listening when run directly (not imported for tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  initializeDatabase()
    .then(() => {
      console.log('📦 Database initialized');
      app.listen(PORT, () => {
        console.log(`🚀 Financial Dashboard API running on port ${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
