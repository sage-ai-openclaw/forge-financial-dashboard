import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
