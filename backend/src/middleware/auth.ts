import { Response, NextFunction } from 'express';
import { getDatabase } from '../database';
import { AuthenticatedRequest, ApiKey } from '../types/external';

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'API key required' });
    return;
  }

  try {
    const db = await getDatabase();
    const row = await db.get(
      'SELECT * FROM api_keys WHERE key = ? AND is_active = 1',
      apiKey
    );

    if (!row) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key' });
      return;
    }

    const keyData: ApiKey = {
      id: row.id,
      key: row.key,
      name: row.name,
      permissions: row.permissions.split(','),
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      isActive: row.is_active === 1,
    };

    // Update last used timestamp
    await db.run(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      row.id
    );

    req.apiKey = keyData;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('*')) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: `Missing required permission: ${permission}` 
      });
      return;
    }

    next();
  };
}
