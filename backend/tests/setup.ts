import { beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/database';

// Use in-memory DB for all tests
process.env.DB_PATH = ':memory:';

beforeAll(async () => {
  await initializeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  const db = await getDatabase();
  // Clean tables in correct order
  await db.run('DELETE FROM transactions');
  await db.run('DELETE FROM budgets');
  await db.run('DELETE FROM categories');
  // Reset sequences
  await db.run("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'categories', 'budgets')").catch(() => {});
});
