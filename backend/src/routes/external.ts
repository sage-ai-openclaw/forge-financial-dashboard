import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database';
import { AuthenticatedRequest, WebhookEvent } from '../types/external';
import { generateWebhookSecret, triggerWebhook } from '../services/webhook';
import { requirePermission } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to all external routes
router.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

// GET /api/external/transactions - List transactions (external access)
router.get('/transactions', requirePermission('read'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      type: req.query.type as 'income' | 'expense' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.startDate) {
      query += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters.categoryId) {
      query += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY t.date DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await db.all(query, params);
    
    const transactions = rows.map(row => ({
      id: row.id,
      amount: row.amount,
      description: row.description,
      date: row.date,
      type: row.type,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      data: transactions,
      meta: {
        limit: filters.limit,
        offset: filters.offset,
        total: transactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching external transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/external/transactions - Create transaction via external API
router.post('/transactions', requirePermission('write'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const { amount, description, date, categoryId, type } = req.body;

    // Validate required fields
    if (!amount || !description || !date || !type) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'amount, description, date, and type are required',
      });
    }

    const result = await db.run(
      `INSERT INTO transactions (amount, description, date, category_id, type)
       VALUES (?, ?, ?, ?, ?)`,
      amount,
      description,
      date,
      categoryId || null,
      type
    );

    const transaction = await db.get(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      result.lastID
    );

    const response = {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      type: transaction.type,
      categoryId: transaction.category_id,
      categoryName: transaction.category_name,
      categoryColor: transaction.category_color,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };

    // Trigger webhook
    await triggerWebhook('transaction.created', response);

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating external transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// GET /api/external/categories - List categories
router.get('/categories', requirePermission('read'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM categories ORDER BY name');

    const categories = rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color,
      createdAt: row.created_at,
    }));

    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching external categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/external/budgets - List budgets
router.get('/budgets', requirePermission('read'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const month = req.query.month as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let query = `
      SELECT b.*, c.name as category_name, c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (month) {
      query += ' AND b.month = ?';
      params.push(month);
    }
    if (year) {
      query += ' AND b.year = ?';
      params.push(year);
    }

    query += ' ORDER BY b.year DESC, b.month DESC';

    const rows = await db.all(query, params);

    const budgets = rows.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
    }));

    res.json({ data: budgets });
  } catch (error) {
    console.error('Error fetching external budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /api/external/summary/monthly - Get monthly summary
router.get('/summary/monthly', requirePermission('read'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const month = req.query.month as string || new Date().toISOString().slice(5, 7);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Get income and expense totals
    const totals = await db.get(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions
       WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
      month,
      year.toString()
    );

    // Get category breakdown
    const categories = await db.all(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(t.amount), 0) as amount
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id 
         AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
       WHERE c.type = 'expense'
       GROUP BY c.id
       HAVING amount > 0
       ORDER BY amount DESC`,
      month,
      year.toString()
    );

    const totalExpense = totals.total_expense || 0;
    const categoryBreakdown = categories.map((cat: any) => ({
      categoryId: cat.category_id,
      categoryName: cat.category_name,
      categoryColor: cat.category_color,
      amount: cat.amount,
      percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
    }));

    res.json({
      month,
      year,
      totalIncome: totals.total_income || 0,
      totalExpense: totals.total_expense || 0,
      netAmount: (totals.total_income || 0) - (totals.total_expense || 0),
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

// POST /api/external/webhooks - Create webhook
router.post('/webhooks', requirePermission('webhooks'), async (req: AuthenticatedRequest, res) => {
  try {
    const result = createWebhookSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    const db = await getDatabase();
    const secret = generateWebhookSecret();

    const insertResult = await db.run(
      `INSERT INTO webhooks (url, events, secret) VALUES (?, ?, ?)`,
      result.data.url,
      result.data.events.join(','),
      secret
    );

    const webhook = await db.get('SELECT * FROM webhooks WHERE id = ?', insertResult.lastID);

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events.split(','),
      secret, // Only returned once on creation
      isActive: webhook.is_active === 1,
      createdAt: webhook.created_at,
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// GET /api/external/webhooks - List webhooks
router.get('/webhooks', requirePermission('webhooks'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT id, url, events, is_active, created_at FROM webhooks ORDER BY created_at DESC');

    const webhooks = rows.map(row => ({
      id: row.id,
      url: row.url,
      events: row.events.split(','),
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    }));

    res.json({ data: webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// DELETE /api/external/webhooks/:id - Delete webhook
router.delete('/webhooks/:id', requirePermission('webhooks'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const id = parseInt(req.params.id);

    const result = await db.run('DELETE FROM webhooks WHERE id = ?', id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// GET /api/external/webhooks/:id/deliveries - Get webhook delivery history
router.get('/webhooks/:id/deliveries', requirePermission('webhooks'), async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDatabase();
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;

    const rows = await db.all(
      `SELECT * FROM webhook_deliveries 
       WHERE webhook_id = ? 
       ORDER BY delivered_at DESC 
       LIMIT ?`,
      id,
      limit
    );

    const deliveries = rows.map(row => ({
      id: row.id,
      event: row.event,
      payload: JSON.parse(row.payload),
      responseStatus: row.response_status,
      success: row.success === 1,
      deliveredAt: row.delivered_at,
    }));

    res.json({ data: deliveries });
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

export default router;
