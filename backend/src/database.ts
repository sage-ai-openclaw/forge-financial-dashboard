import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

function getDbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'finance.db');
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  const dbPath = getDbPath();

  if (dbPath !== ':memory:' && !dbPath.startsWith('/tmp')) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await createTables();

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

async function createTables(): Promise<void> {
  const database = await getDatabase();

  // Categories table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Budgets table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, month, year)
    )
  `);

  // Indexes
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year)`);

  // Insert default categories
  const defaultCategories = [
    { name: 'Salary', type: 'income', color: '#22c55e' },
    { name: 'Freelance', type: 'income', color: '#16a34a' },
    { name: 'Food', type: 'expense', color: '#ef4444' },
    { name: 'Transport', type: 'expense', color: '#f97316' },
    { name: 'Shopping', type: 'expense', color: '#8b5cf6' },
    { name: 'Entertainment', type: 'expense', color: '#ec4899' },
    { name: 'Bills', type: 'expense', color: '#6366f1' },
    { name: 'Health', type: 'expense', color: '#14b8a6' },
  ];

  for (const cat of defaultCategories) {
    await database.run(
      `INSERT OR IGNORE INTO categories (name, type, color) VALUES (?, ?, ?)`,
      cat.name, cat.type, cat.color
    );
  }
}
