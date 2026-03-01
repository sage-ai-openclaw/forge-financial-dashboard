import { Router } from 'express';
import { z } from 'zod';
import { CategoryModel } from '../models/categories';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
  try {
    const type = req.query.type as 'income' | 'expense' | undefined;
    const categories = await CategoryModel.findAll(type);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const result = createCategorySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: result.error.issues,
      });
    }

    const category = await CategoryModel.create(result.data);
    res.status(201).json(category);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await CategoryModel.findById(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await CategoryModel.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
