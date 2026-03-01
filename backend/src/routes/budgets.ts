import { Router } from 'express';
import { z } from 'zod';
import { BudgetModel } from '../models/budgets';
import { CategoryModel } from '../models/categories';

const router = Router();

const MONTHS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

const createBudgetSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  month: z.string().regex(/^(1[0-2]|[1-9])$/, 'Month must be 1-12'),
  year: z.number().int().min(2000).max(2100),
});

const updateBudgetSchema = z.object({
  amount: z.number().positive(),
});

// GET /api/budgets - List all budgets
router.get('/', async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const budgets = await BudgetModel.findAll(month, year);
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /api/budgets/with-spending - Get budgets with spending comparison
router.get('/with-spending', async (req, res) => {
  try {
    const month = req.query.month as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    if (!month || year === undefined) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const budgets = await BudgetModel.findAllWithSpending(month, year);
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets with spending:', error);
    res.status(500).json({ error: 'Failed to fetch budgets with spending' });
  }
});

// GET /api/budgets/summary - Get monthly budget summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const month = req.query.month as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    if (!month || year === undefined) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const summary = await BudgetModel.getMonthlyBudgetSummary(month, year);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

// POST /api/budgets - Create new budget
router.post('/', async (req, res) => {
  try {
    const result = createBudgetSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    // Verify category exists
    const category = await CategoryModel.findById(result.data.categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for existing budget for this category/month/year
    const existing = await BudgetModel.findByCategoryMonthYear(
      result.data.categoryId,
      result.data.month,
      result.data.year
    );

    if (existing) {
      return res.status(409).json({ 
        error: 'Budget already exists for this category and period',
        existingBudget: existing
      });
    }

    const budget = await BudgetModel.create(result.data);
    res.status(201).json(budget);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Budget already exists for this category and period' });
    }
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// GET /api/budgets/:id - Get single budget
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const budget = await BudgetModel.findById(id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

// PATCH /api/budgets/:id - Update budget amount
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = updateBudgetSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    const budget = await BudgetModel.update(id, result.data.amount);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE /api/budgets/:id - Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await BudgetModel.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;
