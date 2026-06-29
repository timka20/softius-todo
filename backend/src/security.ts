import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getSession } from './db.js';
import { User } from './types.js';

const FRONTEND_ORIGIN = 'http://localhost:14364';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function applySecurityMiddleware(app: import('express').Express): void {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", FRONTEND_ORIGIN, 'http://localhost:14365'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов, попробуйте позже' },
  });
  app.use(limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток входа, попробуйте позже' },
  });
  app.set('authLimiter', authLimiter);
}

export function corsOptions() {
  return {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: 'Сессия истекла или недействительна' });
    return;
  }
  const { getUserById } = await import('./db.js');
  const user = getUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: 'Пользователь не найден' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...roles: User['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Недостаточно прав' });
      return;
    }
    next();
  };
}

export function handleErrors(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
