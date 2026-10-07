import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type TokenPayload } from '../lib/jwt.js';
import { HttpError } from '../lib/httpError.js';
import type { UserRole } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookies = req.headers.cookie;
  if (cookies) {
    for (const part of cookies.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === 'sp_token') return decodeURIComponent(v.join('='));
    }
  }
  return null;
}

/** Requires a valid JWT; populates req.userId / req.userRole. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const payload: TokenPayload | null = token ? verifyToken(token) : null;
  if (!payload) {
    next(new HttpError(401, 'Please sign in to continue'));
    return;
  }
  req.userId = payload.sub;
  req.userRole = payload.role;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      next(new HttpError(403, 'You do not have permission to do that'));
      return;
    }
    next();
  };
}

/** Attaches user info if a valid token is present, but never blocks. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    req.userId = payload.sub;
    req.userRole = payload.role;
  }
  next();
}
