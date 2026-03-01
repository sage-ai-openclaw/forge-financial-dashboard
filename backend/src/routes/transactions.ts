import { Router } from 'express';
import { z } from 'zod';
import { TransactionModel } from '../models/transactions';

const router = Router();

// Validation schemas
const createTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  categoryId: z.number().int().optional(),
  type: z.enum(['income', 'expense']),
});

const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.number().int().nullable().optional(),
  type: z.enum(['income', 'expense']).optional(),
});

// GET /api/transactions - List all transactions with optional filters
router.get('/', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      type: req.query.type as 'income' | 'expense' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const transactions = await TransactionModel.findAll(filters);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
  try {
    const result = createTransactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    const transaction = await TransactionModel.create(result.data);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const transaction = await TransactionModel.findById(id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// PATCH /api/transactions/:id - Update transaction
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = updateTransactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    const transaction = await TransactionModel.update(id, result.data);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await TransactionModel.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// GET /api/transactions/summary/monthly - Get monthly summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const month = req.query.month as string || new Date().toISOString().slice(5, 7);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const summary = await TransactionModel.getMonthlySummary(month, year);
    res.json({
      month,
      year,
      ...summary,
      netAmount: summary.totalIncome - summary.totalExpense,
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

export default router;
