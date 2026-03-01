import { getDatabase } from '../database';
import type { Budget, CreateBudgetInput } from '../types';

export interface BudgetWithSpending extends Budget {
  categoryName: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentageUsed: number;
}

export class BudgetModel {
  static async create(input: CreateBudgetInput): Promise<Budget> {
    const db = await getDatabase();

    const result = await db.run(`
      INSERT INTO budgets (category_id, amount, month, year)
      VALUES (?, ?, ?, ?)
    `, [
      input.categoryId,
      input.amount,
      input.month,
      input.year,
    ]);

    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM budgets WHERE id = ?', id);
    if (!row) return null;
    return this.mapRowToBudget(row);
  }

  static async findByCategoryMonthYear(
    categoryId: number,
    month: string,
    year: number
  ): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.get(
      'SELECT * FROM budgets WHERE category_id = ? AND month = ? AND year = ?',
      categoryId, month, year
    );
    if (!row) return null;
    return this.mapRowToBudget(row);
  }

  static async findAll(month?: string, year?: number): Promise<Budget[]> {
    const db = await getDatabase();

    let query = 'SELECT * FROM budgets';
    const params: any[] = [];

    if (month && year !== undefined) {
      query += ' WHERE month = ? AND year = ?';
      params.push(month, year);
    } else if (month) {
      query += ' WHERE month = ?';
      params.push(month);
    } else if (year !== undefined) {
      query += ' WHERE year = ?';
      params.push(year);
    }

    query += ' ORDER BY year DESC, month DESC';

    const rows = await db.all(query, params);
    return rows.map(row => this.mapRowToBudget(row));
  }

  static async findAllWithSpending(month: string, year: number): Promise<BudgetWithSpending[]> {
    const db = await getDatabase();

    const rows = await db.all(`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON 
        t.category_id = b.category_id 
        AND t.type = 'expense'
        AND strftime('%m', t.date) = printf('%02d', CAST(b.month AS INTEGER))
        AND strftime('%Y', t.date) = CAST(b.year AS TEXT)
      WHERE b.month = ? AND b.year = ?
      GROUP BY b.id
      ORDER BY b.amount DESC
    `, month, year);

    return rows.map(row => this.mapRowToBudgetWithSpending(row));
  }

  static async update(id: number, amount: number): Promise<Budget | null> {
    const db = await getDatabase();
    
    await db.run(
      'UPDATE budgets SET amount = ? WHERE id = ?',
      amount, id
    );

    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM budgets WHERE id = ?', id);
    return result.changes! > 0;
  }

  static async getMonthlyBudgetSummary(month: string, year: number): Promise<{
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    categoryCount: number;
    overBudgetCount: number;
  }> {
    const db = await getDatabase();

    const result = await db.get(`
      SELECT 
        COALESCE(SUM(b.amount), 0) as total_budgeted,
        COALESCE(SUM(spent.spent), 0) as total_spent,
        COUNT(DISTINCT b.id) as category_count,
        SUM(CASE WHEN spent.spent > b.amount THEN 1 ELSE 0 END) as over_budget_count
      FROM budgets b
      LEFT JOIN (
        SELECT 
          category_id,
          COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE type = 'expense'
          AND strftime('%m', date) = printf('%02d', CAST(? AS INTEGER))
          AND strftime('%Y', date) = CAST(? AS TEXT)
        GROUP BY category_id
      ) spent ON spent.category_id = b.category_id
      WHERE b.month = ? AND b.year = ?
    `, month, year, month, year);

    const totalBudgeted = result.total_budgeted || 0;
    const totalSpent = result.total_spent || 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      categoryCount: result.category_count || 0,
      overBudgetCount: result.over_budget_count || 0,
    };
  }

  private static mapRowToBudget(row: any): Budget {
    return {
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
    };
  }

  private static mapRowToBudgetWithSpending(row: any): BudgetWithSpending {
    const spent = row.spent || 0;
    const remaining = row.amount - spent;
    const percentageUsed = row.amount > 0 ? Math.min(100, (spent / row.amount) * 100) : 0;

    return {
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      spent,
      remaining,
      percentageUsed,
    };
  }
}
