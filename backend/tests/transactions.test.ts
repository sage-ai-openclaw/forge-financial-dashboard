import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Transactions API (US1)', () => {
  describe('POST /api/transactions', () => {
    it('should create an expense transaction', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: 45.50,
          description: 'Grocery shopping',
          date: '2026-03-01',
          type: 'expense',
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(45.50);
      expect(response.body.description).toBe('Grocery shopping');
      expect(response.body.type).toBe('expense');
      expect(response.body.id).toBeDefined();
    });

    it('should create an income transaction', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: 2500.00,
          description: 'Monthly salary',
          date: '2026-03-01',
          type: 'income',
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(2500.00);
      expect(response.body.type).toBe('income');
    });

    it('should create transaction with category', async () => {
      // First create a category
      const catRes = await request(app)
        .post('/api/categories')
        .send({ name: 'Food', type: 'expense', color: '#ef4444' });

      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: 25.00,
          description: 'Lunch',
          date: '2026-03-01',
          categoryId: catRes.body.id,
          type: 'expense',
        });

      expect(response.status).toBe(201);
      expect(response.body.categoryId).toBe(catRes.body.id);
    });

    it('should reject negative amounts', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: -50,
          description: 'Invalid',
          date: '2026-03-01',
          type: 'expense',
        });

      expect(response.status).toBe(400);
    });

    it('should reject empty description', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: 50,
          description: '',
          date: '2026-03-01',
          type: 'expense',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          amount: 50,
          description: 'Test',
          date: 'invalid-date',
          type: 'expense',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return empty array when no transactions', async () => {
      const response = await request(app).get('/api/transactions');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all transactions', async () => {
      await request(app).post('/api/transactions').send({
        amount: 50,
        description: 'Item 1',
        date: '2026-03-01',
        type: 'expense',
      });
      await request(app).post('/api/transactions').send({
        amount: 100,
        description: 'Item 2',
        date: '2026-03-02',
        type: 'income',
      });

      const response = await request(app).get('/api/transactions');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by type', async () => {
      await request(app).post('/api/transactions').send({
        amount: 50, description: 'Expense', date: '2026-03-01', type: 'expense',
      });
      await request(app).post('/api/transactions').send({
        amount: 100, description: 'Income', date: '2026-03-02', type: 'income',
      });

      const response = await request(app).get('/api/transactions?type=expense');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('expense');
    });

    it('should filter by date range', async () => {
      await request(app).post('/api/transactions').send({
        amount: 50, description: 'Jan', date: '2026-01-15', type: 'expense',
      });
      await request(app).post('/api/transactions').send({
        amount: 100, description: 'Feb', date: '2026-02-15', type: 'expense',
      });

      const response = await request(app).get('/api/transactions?startDate=2026-02-01&endDate=2026-02-28');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Feb');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction by id', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        amount: 50, description: 'Test', date: '2026-03-01', type: 'expense',
      });

      const response = await request(app).get(`/api/transactions/${createRes.body.id}`);
      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Test');
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app).get('/api/transactions/99999');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/transactions/:id', () => {
    it('should update transaction amount', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        amount: 50, description: 'Old', date: '2026-03-01', type: 'expense',
      });

      const response = await request(app)
        .patch(`/api/transactions/${createRes.body.id}`)
        .send({ amount: 75 });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(75);
      expect(response.body.description).toBe('Old'); // unchanged
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app).patch('/api/transactions/99999').send({ amount: 100 });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete transaction', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        amount: 50, description: 'To delete', date: '2026-03-01', type: 'expense',
      });

      const delRes = await request(app).delete(`/api/transactions/${createRes.body.id}`);
      expect(delRes.status).toBe(204);

      const getRes = await request(app).get(`/api/transactions/${createRes.body.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /api/transactions/summary/monthly', () => {
    it('should return monthly summary', async () => {
      await request(app).post('/api/transactions').send({
        amount: 2500, description: 'Salary', date: '2026-03-01', type: 'income',
      });
      await request(app).post('/api/transactions').send({
        amount: 100, description: 'Food', date: '2026-03-02', type: 'expense',
      });
      await request(app).post('/api/transactions').send({
        amount: 50, description: 'Transport', date: '2026-03-03', type: 'expense',
      });

      const response = await request(app).get('/api/transactions/summary/monthly?month=03&year=2026');
      expect(response.status).toBe(200);
      expect(response.body.totalIncome).toBe(2500);
      expect(response.body.totalExpense).toBe(150);
      expect(response.body.netAmount).toBe(2350);
    });
  });
});
