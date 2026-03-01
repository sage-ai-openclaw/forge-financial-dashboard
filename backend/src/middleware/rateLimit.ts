import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RateLimitEntry } from '../types/external';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = { ...defaultOptions, ...options };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const identifier = req.apiKey?.key || req.ip || 'anonymous';
    const now = Date.now();

    let entry = rateLimitStore.get(identifier);

    // Clean up expired entry
    if (entry && now > entry.resetAt) {
      rateLimitStore.delete(identifier);
      entry = undefined;
    }

    // Initialize new entry
    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
      rateLimitStore.set(identifier, entry);
    }

    // Check limit
    if (entry.count >= config.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    // Increment count
    entry.count++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    next();
  };
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
