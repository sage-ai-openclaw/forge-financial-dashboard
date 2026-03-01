import { getDatabase } from '../database';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionWithCategory } from '../types';

export class TransactionModel {
  static async create(input: CreateTransactionInput): Promise<Transaction> {
    const db = await getDatabase();

    const result = await db.run(`
      INSERT INTO transactions (amount, description, date, category_id, type)
      VALUES (?, ?, ?, ?, ?)
    `, [
      input.amount,
      input.description,
      input.date,
      input.categoryId || null,
      input.type,
    ]);

    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM transactions WHERE id = ?', id);
    if (!row) return null;
    return this.mapRowToTransaction(row);
  }

  static async findAll(filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: number;
    type?: 'income' | 'expense';
    limit?: number;
    offset?: number;
  }): Promise<TransactionWithCategory[]> {
    const db = await getDatabase();

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.startDate) {
      query += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters?.categoryId) {
      query += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters?.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await db.all(query, params);
    return rows.map(row => this.mapRowToTransactionWithCategory(row));
  }

  static async update(id: number, input: UpdateTransactionInput): Promise<Transaction | null> {
    const db = await getDatabase();

    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.amount !== undefined) {
      updates.push('amount = ?');
      values.push(input.amount);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.date !== undefined) {
      updates.push('date = ?');
      values.push(input.date);
    }
    if (input.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(input.categoryId);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM transactions WHERE id = ?', id);
    return result.changes! > 0;
  }

  static async getMonthlySummary(month: string, year: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    byCategory: { categoryId: number | null; amount: number }[];
  }> {
    const db = await getDatabase();

    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const incomeRow = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ?`,
      startDate, endDate
    );

    const expenseRow = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?`,
      startDate, endDate
    );

    const byCategory = await db.all(
      `SELECT category_id as categoryId, COALESCE(SUM(amount), 0) as amount 
       FROM transactions 
       WHERE date BETWEEN ? AND ? 
       GROUP BY category_id`,
      startDate, endDate
    );

    return {
      totalIncome: incomeRow.total,
      totalExpense: expenseRow.total,
      byCategory,
    };
  }

  private static mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      amount: row.amount,
      description: row.description,
      date: row.date,
      categoryId: row.category_id,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToTransactionWithCategory(row: any): TransactionWithCategory {
    return {
      ...this.mapRowToTransaction(row),
      categoryName: row.category_name,
      categoryColor: row.category_color,
    };
  }
}
