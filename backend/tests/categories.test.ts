import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Categories API (US3)', () => {
  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({
          name: 'Test Category',
          type: 'expense',
          color: '#ff0000',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Category');
      expect(response.body.type).toBe('expense');
      expect(response.body.color).toBe('#ff0000');
    });

    it('should reject duplicate category names', async () => {
      await request(app).post('/api/categories').send({
        name: 'Unique Category',
        type: 'expense',
      });

      const response = await request(app).post('/api/categories').send({
        name: 'Unique Category',
        type: 'income',
      });

      expect(response.status).toBe(409);
    });

    it('should reject invalid color format', async () => {
      const response = await request(app).post('/api/categories').send({
        name: 'Bad Color',
        type: 'expense',
        color: 'red',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories including custom ones', async () => {
      // Create a custom category first
      await request(app).post('/api/categories').send({
        name: 'Custom Cat',
        type: 'expense',
        color: '#123456',
      });

      const response = await request(app).get('/api/categories');
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((c: any) => c.name === 'Custom Cat')).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app).get('/api/categories?type=income');
      expect(response.status).toBe(200);
      expect(response.body.every((c: any) => c.type === 'income')).toBe(true);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      const createRes = await request(app).post('/api/categories').send({
        name: 'To Delete',
        type: 'expense',
      });

      const delRes = await request(app).delete(`/api/categories/${createRes.body.id}`);
      expect(delRes.status).toBe(204);

      const getRes = await request(app).get(`/api/categories/${createRes.body.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
