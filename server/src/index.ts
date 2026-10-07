import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { store, initStore } from './data/store.js';
import { seed } from './seed/seed.js';
import { initAi, aiStatus } from './ai/index.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { matchingRouter } from './routes/matching.js';
import { projectsRouter } from './routes/projects.js';
import { resumeRouter } from './routes/resumeRoutes.js';
import { applicationsRouter } from './routes/applications.js';
import { jobsRouter } from './routes/jobs.js';
import { adminRouter } from './routes/admin.js';
import { HttpError } from './lib/httpError.js';
import { TARGET_ROLES } from './domain/roles.js';
import { SKILL_TAXONOMY } from './domain/skills.js';

// ------------------------------------------------------------- bootstrap ----

async function main(): Promise<void> {
  initAi();

  await initStore();

  await seed();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? ['http://localhost:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  // ------------------------------------------------------------- routes ----
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'skillpath-api', time: new Date().toISOString(), ai: aiStatus() });
  });
  app.get('/api/meta', (_req, res) => {
    res.json({
      roles: TARGET_ROLES.map((r) => ({ id: r.id, title: r.title, blurb: r.blurb })),
      skills: SKILL_TAXONOMY.map((s) => ({ key: s.canonical, label: s.label, category: s.category })),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/matching', matchingRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/resume', resumeRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/admin', adminRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // ------------------------------------------------------ error handler ----
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const status = (err as { status?: number })?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: (err as Error).message || 'Request failed' });
      return;
    }
    console.error('[api] Unexpected error:', err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });  const port = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 4000;
  app.listen(port, () => {
    console.log(`[skillpath] API ready on http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
