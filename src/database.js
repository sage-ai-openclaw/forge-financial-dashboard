const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/financial.db');

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

function initializeDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Create transactions table
      database.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating transactions table:', err.message);
          reject(err);
          return;
        }
        console.log('Transactions table ready');
      });

      // Create categories table
      database.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT DEFAULT '💰',
          color TEXT DEFAULT '#3B82F6',
          type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating categories table:', err.message);
          reject(err);
          return;
        }
        console.log('Categories table ready');
      });

      // Insert default categories
      const defaultCategories = [
        { name: 'Food', icon: '🍔', color: '#EF4444', type: 'expense' },
        { name: 'Transport', icon: '🚗', color: '#F59E0B', type: 'expense' },
        { name: 'Entertainment', icon: '🎬', color: '#8B5CF6', type: 'expense' },
        { name: 'Bills', icon: '💡', color: '#EC4899', type: 'expense' },
        { name: 'Health', icon: '💊', color: '#10B981', type: 'expense' },
        { name: 'Shopping', icon: '🛍️', color: '#6366F1', type: 'expense' },
        { name: 'Salary', icon: '💵', color: '#22C55E', type: 'income' },
        { name: 'Other Income', icon: '💸', color: '#14B8A6', type: 'income' }
      ];

      const insertCategory = database.prepare(`
        INSERT OR IGNORE INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)
      `);

      defaultCategories.forEach(cat => {
        insertCategory.run(cat.name, cat.icon, cat.color, cat.type);
      });

      insertCategory.finalize((err) => {
        if (err) {
          console.error('Error inserting default categories:', err.message);
          reject(err);
          return;
        }
        console.log('Default categories inserted');
        resolve();
      });
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          reject(err);
        } else {
          console.log('Database connection closed');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
