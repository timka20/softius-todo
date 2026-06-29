import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import {
  getUserWithPassword,
  createSession,
  deleteSession,
  getUserById,
  createUser,
  getAllUsers,
  getWorkers,
  getAssignableUsers,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  deleteUserSessions,
  ensureInitialAdmin,
  normalizePhone,
  isValidRussianPhone,
} from './db.js';
import {
  validateUserInput,
  validateProfileInput,
  validatePasswordChange,
  validateIdParam,
} from './validators.js';
import { AuthenticatedRequest, authenticate, requireRole } from './security.js';

ensureInitialAdmin();

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа, попробуйте позже' },
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/auth/login', loginLimiter, (req: Request, res: Response) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    res.status(400).json({ error: 'Логин и пароль обязательны' });
    return;
  }
  const record = getUserWithPassword(String(login));
  if (!record || !bcrypt.compareSync(String(password), record.passwordHash)) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }
  const token = createSession(record.user.id);
  res.cookie('session', token, COOKIE_OPTIONS);
  res.json({ user: record.user });
});

router.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.session;
  if (token) deleteSession(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

router.put('/auth/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const validation = validateProfileInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Ошибка валидации', details: validation.errors });
    return;
  }
  const user = updateUserProfile(req.user!.id, validation.data);
  res.json({ user });
});

router.put('/auth/password', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const validation = validatePasswordChange(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Ошибка валидации', details: validation.errors });
    return;
  }
  updateUserPassword(req.user!.id, validation.password);
  deleteUserSessions(req.user!.id);
  res.clearCookie('session');
  res.json({ ok: true, message: 'Пароль изменён. Войдите заново.' });
});

router.get('/assignable-users', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(getAssignableUsers());
});

router.post('/users', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const validation = validateUserInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Ошибка валидации', details: validation.errors });
    return;
  }
  try {
    const user = createUser(validation.data);
    res.status(201).json(user);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }
    throw err;
  }
});

router.get('/users', authenticate, requireRole('admin'), (_req: AuthenticatedRequest, res: Response) => {
  res.json(getAllUsers());
});

router.get('/workers', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role === 'admin') {
    res.json(getWorkers());
    return;
  }
  res.json([req.user!]);
});

router.delete('/users/:id', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор пользователя должен быть положительным числом' });
    return;
  }
  if (id === req.user!.id) {
    res.status(400).json({ error: 'Нельзя удалить самого себя' });
    return;
  }
  deleteUserSessions(id);
  const deleted = deleteUser(id);
  if (!deleted) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  res.status(204).send();
});

export default router;
