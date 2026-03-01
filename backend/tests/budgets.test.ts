import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Budgets API (US4)', () => {
  let categoryId: number;

  beforeAll(async () => {
    // Create a test category for budgets
    const response = await request(app)
      .post('/api/categories')
      .send({
        name: 'Budget Test Category',
        type: 'expense',
        color: '#ff0000',
      });
    categoryId = response.body.id;
  });

  describe('POST /api/budgets', () => {
    it('should create a new budget', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 500,
          month: '3',
          year: 2026,
        });

      expect(response.status).toBe(201);
      expect(response.body.categoryId).toBe(categoryId);
      expect(response.body.amount).toBe(500);
      expect(response.body.month).toBe('3');
      expect(response.body.year).toBe(2026);
      expect(response.body.id).toBeDefined();
    });

    it('should reject duplicate budget for same category/month/year', async () => {
      // Create first budget
      await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 300,
          month: '4',
          year: 2026,
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 400,
          month: '4',
          year: 2026,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject budget for non-existent category', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          categoryId: 99999,
          amount: 500,
          month: '5',
          year: 2026,
        });

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          amount: 500,
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid month', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 500,
          month: '13',
          year: 2026,
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: -100,
          month: '6',
          year: 2026,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/budgets', () => {
    it('should return all budgets', async () => {
      const response = await request(app).get('/api/budgets');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by month and year', async () => {
      const response = await request(app)
        .get('/api/budgets?month=3&year=2026');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/budgets/with-spending', () => {
    it('should return budgets with spending data', async () => {
      const response = await request(app)
        .get('/api/budgets/with-spending?month=3&year=2026');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require month and year', async () => {
      const response = await request(app)
        .get('/api/budgets/with-spending');

      expect(response.status).toBe(400);
    });

    it('should include spending data for budgets', async () => {
      // Create a budget
      const budgetRes = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 1000,
          month: '7',
          year: 2026,
        });

      const response = await request(app)
        .get('/api/budgets/with-spending?month=7&year=2026');

      expect(response.status).toBe(200);
      
      const budget = response.body.find((b: any) => b.id === budgetRes.body.id);
      if (budget) {
        expect(budget.spent).toBeDefined();
        expect(budget.remaining).toBeDefined();
        expect(budget.percentageUsed).toBeDefined();
        expect(budget.categoryName).toBeDefined();
        expect(budget.categoryColor).toBeDefined();
      }
    });
  });

  describe('GET /api/budgets/summary/monthly', () => {
    it('should return monthly budget summary', async () => {
      const response = await request(app)
        .get('/api/budgets/summary/monthly?month=3&year=2026');

      expect(response.status).toBe(200);
      expect(response.body.totalBudgeted).toBeDefined();
      expect(response.body.totalSpent).toBeDefined();
      expect(response.body.totalRemaining).toBeDefined();
      expect(response.body.categoryCount).toBeDefined();
      expect(response.body.overBudgetCount).toBeDefined();
    });

    it('should require month and year', async () => {
      const response = await request(app)
        .get('/api/budgets/summary/monthly');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/budgets/:id', () => {
    it('should return a single budget', async () => {
      // Create a budget first
      const createRes = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 750,
          month: '8',
          year: 2026,
        });

      const response = await request(app)
        .get(`/api/budgets/${createRes.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createRes.body.id);
      expect(response.body.amount).toBe(750);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await request(app)
        .get('/api/budgets/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/budgets/:id', () => {
    it('should update budget amount', async () => {
      // Create a budget
      const createRes = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 300,
          month: '9',
          year: 2026,
        });

      const response = await request(app)
        .patch(`/api/budgets/${createRes.body.id}`)
        .send({ amount: 600 });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(600);
    });

    it('should reject invalid amount', async () => {
      const createRes = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 300,
          month: '10',
          year: 2026,
        });

      const response = await request(app)
        .patch(`/api/budgets/${createRes.body.id}`)
        .send({ amount: -50 });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await request(app)
        .patch('/api/budgets/99999')
        .send({ amount: 500 });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    it('should delete a budget', async () => {
      // Create a budget
      const createRes = await request(app)
        .post('/api/budgets')
        .send({
          categoryId,
          amount: 400,
          month: '11',
          year: 2026,
        });

      const delRes = await request(app)
        .delete(`/api/budgets/${createRes.body.id}`);

      expect(delRes.status).toBe(204);

      const getRes = await request(app)
        .get(`/api/budgets/${createRes.body.id}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await request(app)
        .delete('/api/budgets/99999');

      expect(response.status).toBe(404);
    });
  });
});
