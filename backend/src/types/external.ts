import { Request } from 'express';

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

export type WebhookEvent = 
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'budget.created'
  | 'budget.updated'
  | 'budget.deleted';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}
