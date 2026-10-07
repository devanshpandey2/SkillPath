import jwt from 'jsonwebtoken';

const SECRET: string = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string;
  role: 'student' | 'recruiter' | 'admin';
}

export function signToken(payload: TokenPayload): string {
  if (!process.env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET not set — using insecure dev secret. Set JWT_SECRET in production!');
  }
  return jwt.sign(payload, SECRET, { expiresIn: TTL_SECONDS });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === 'production';

export const cookieOpts = () =>
  ({
    httpOnly: true,
    sameSite: isProd ? ('strict' as const) : ('lax' as const),
    secure: isProd,
    maxAge: TTL_SECONDS * 1000,
    path: '/',
  }) as const;
