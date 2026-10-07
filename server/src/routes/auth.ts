import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { signToken, cookieOpts } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[a-zA-Z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  role: z.enum(['student', 'recruiter', 'admin']),
});

/**
 * POST /api/auth/register
 * Body: { name, email, password, role }
 * 201 -> { user, token? }
 */
authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    throw new HttpError(400, msg);
  }
  const { name, email, password, role } = parsed.data;
  if (store.findUserByEmail(email)) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const user = store.createUser({
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
  });

  const token = signToken({ sub: user.id, role: user.role });
  res.cookie('sp_token', token, cookieOpts());
  res.status(201).json({ user: publicUser(user), token });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

/** POST /api/auth/login — body { email, password } -> 200 { user, token } */
authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { email, password } = parsed.data;
  const user = store.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new HttpError(401, 'Invalid email or password');
  }
  const token = signToken({ sub: user.id, role: user.role });
  res.cookie('sp_token', token, cookieOpts());
  res.json({ user: publicUser(user), token });
});

/** GET /api/auth/me — returns the signed-in user (401 if none) */
authRouter.get('/me', requireAuth, (req, res) => {
  const user = store.getUser(req.userId!);
  if (!user) throw new HttpError(401, 'Session no longer valid');
  res.json({ user: publicUser(user) });
});

/** POST /api/auth/logout — clears the auth cookie */
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('sp_token', { ...cookieOpts(), maxAge: 0 });
  res.json({ ok: true });
});

function publicUser(u: { id: string; email: string; name: string; role: 'student' | 'recruiter' | 'admin' }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export { publicUser };
