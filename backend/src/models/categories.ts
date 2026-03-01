import { getDatabase } from '../database';
import type { Category, CreateCategoryInput } from '../types';

export class CategoryModel {
  static async create(input: CreateCategoryInput): Promise<Category> {
    const db = await getDatabase();

    const result = await db.run(`
      INSERT INTO categories (name, type, color)
      VALUES (?, ?, ?)
    `, [
      input.name,
      input.type,
      input.color || '#6366f1',
    ]);

    return (await this.findById(result.lastID!))!;
  }

  static async findById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM categories WHERE id = ?', id);
    if (!row) return null;
    return this.mapRowToCategory(row);
  }

  static async findAll(type?: 'income' | 'expense'): Promise<Category[]> {
    const db = await getDatabase();

    let query = 'SELECT * FROM categories';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY name';

    const rows = await db.all(query, params);
    return rows.map(row => this.mapRowToCategory(row));
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.run('DELETE FROM categories WHERE id = ?', id);
    return result.changes! > 0;
  }

  private static mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color,
      createdAt: row.created_at,
    };
  }
}
