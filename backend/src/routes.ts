import { Router, Response } from 'express';
import {
  createTask,
  updateTask,
  updateTaskProgress,
  deleteTask,
  getTaskById,
  getTasksForUser,
  getTaskHistory,
  getAllHistory,
  getUpcomingDeadlines,
  getRecentlyAssignedTasks,
  refreshStatuses,
} from './db.js';
import { validateTaskInput, validateIdParam } from './validators.js';
import { AuthenticatedRequest, authenticate, requireRole } from './security.js';

const router = Router();

function escapeCsv(value: unknown): string {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

router.get('/tasks', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const tasks = getTasksForUser(req.user!.id, req.user!.role);
  res.json(tasks);
});

router.get('/tasks/notifications', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const deadlines = getUpcomingDeadlines(req.user!.id, req.user!.role, 24);
  const assigned = req.user!.role === 'worker'
    ? getRecentlyAssignedTasks(req.user!.id, 5)
    : [];
  res.json({ deadlines, assigned });
});

router.get('/tasks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор задачи должен быть положительным целым числом' });
    return;
  }
  const task = getTaskById(id);
  if (!task) {
    res.status(404).json({ error: 'Задача не найдена' });
    return;
  }
  if (req.user!.role === 'worker' && task.createdBy !== req.user!.id && task.assignedTo !== req.user!.id && task.assignedTo !== null) {
    res.status(403).json({ error: 'Нет доступа к задаче' });
    return;
  }
  res.json(task);
});

router.post('/tasks', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const validation = validateTaskInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Ошибка валидации', details: validation.errors });
    return;
  }

  let assignedTo = validation.data.assignedTo ?? req.user!.id;
  let assignedBy: number | null = null;

  if (req.user!.role === 'worker') {
    assignedTo = req.user!.id;
  } else if (validation.data.assignedTo && validation.data.assignedTo !== req.user!.id) {
    assignedBy = req.user!.id;
  }

  const task = createTask(
    { ...validation.data, createdBy: req.user!.id, assignedTo, assignedBy },
    req.user!.id
  );
  res.status(201).json(task);
});

router.put('/tasks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор задачи должен быть положительным целым числом' });
    return;
  }
  const existing = getTaskById(id);
  if (!existing) {
    res.status(404).json({ error: 'Задача не найдена' });
    return;
  }

  const isAdmin = req.user!.role === 'admin';
  const isOwner = existing.createdBy === req.user!.id;
  const isAssigned = existing.assignedTo === req.user!.id;

  if (!isAdmin && !isOwner && !isAssigned) {
    res.status(403).json({ error: 'Нет прав на редактирование задачи' });
    return;
  }

  const validation = validateTaskInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Ошибка валидации', details: validation.errors });
    return;
  }

  let assignedBy: number | undefined = undefined;
  let canReassign = false;

  if (isAdmin) {
    canReassign = true;
    if (validation.data.assignedTo && validation.data.assignedTo !== existing.assignedTo && validation.data.assignedTo !== req.user!.id) {
      assignedBy = req.user!.id;
    }
  }

  const task = updateTask(id, { ...validation.data, assignedBy }, req.user!.id, { canReassign });
  res.json(task);
});

router.patch('/tasks/:id/progress', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор задачи должен быть положительным целым числом' });
    return;
  }
  const existing = getTaskById(id);
  if (!existing) {
    res.status(404).json({ error: 'Задача не найдена' });
    return;
  }
  const isAdmin = req.user!.role === 'admin';
  const isAssigned = existing.assignedTo === req.user!.id;
  const isOwner = existing.createdBy === req.user!.id;
  if (!isAdmin && !isAssigned && !isOwner) {
    res.status(403).json({ error: 'Нет прав на изменение прогресса' });
    return;
  }
  const progress = Number(req.body.progress);
  if (Number.isNaN(progress) || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    res.status(400).json({ error: 'Прогресс должен быть целым числом от 0 до 100' });
    return;
  }
  const task = updateTaskProgress(id, progress, req.user!.id);
  res.json(task);
});

router.delete('/tasks/:id', authenticate, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор задачи должен быть положительным целым числом' });
    return;
  }
  const deleted = deleteTask(id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Задача не найдена' });
    return;
  }
  res.status(204).send();
});

router.get('/tasks/:id/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const id = validateIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Идентификатор задачи должен быть положительным целым числом' });
    return;
  }
  const task = getTaskById(id);
  if (!task) {
    res.status(404).json({ error: 'Задача не найдена' });
    return;
  }
  if (req.user!.role === 'worker' && task.createdBy !== req.user!.id && task.assignedTo !== req.user!.id && task.assignedTo !== null) {
    res.status(403).json({ error: 'Нет доступа к истории задачи' });
    return;
  }
  res.json(getTaskHistory(id, req.user!.id, req.user!.role));
});

router.get('/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json(getAllHistory(req.user!.id, req.user!.role));
});

router.get('/export/csv', authenticate, (req: AuthenticatedRequest, res: Response) => {
  refreshStatuses();
  const tasks = getTasksForUser(req.user!.id, req.user!.role);
  const history = getAllHistory(req.user!.id, req.user!.role);

  const taskHeaders = [
    'ID', 'Название', 'Описание', 'Срок', 'Прогресс', 'Приоритет', 'Статус',
    'Создана пользователем', 'Назначена пользователю', 'Назначена кем', 'Создана', 'Обновлена'
  ];

  const historyHeaders = [
    'ID', 'ID задачи', 'Пользователь', 'Логин', 'Операция', 'Название задачи', 'Описание',
    'Срок', 'Прогресс', 'Приоритет', 'Статус', 'Назначена пользователю', 'Дата'
  ];

  let csv = '';

  csv += 'ЗАДАЧИ\n';
  csv += taskHeaders.map(escapeCsv).join(';') + '\r\n';
  for (const t of tasks) {
    csv += [
      t.id,
      escapeCsv(t.title),
      escapeCsv(t.description),
      escapeCsv(t.deadline),
      t.progress,
      escapeCsv(t.priority),
      escapeCsv(t.status),
      t.createdBy,
      t.assignedTo ?? '',
      t.assignedBy ?? '',
      escapeCsv(t.createdAt),
      escapeCsv(t.updatedAt),
    ].join(';') + '\r\n';
  }

  csv += '\nИСТОРИЯ ИЗМЕНЕНИЙ\n';
  csv += historyHeaders.map(escapeCsv).join(';') + '\r\n';
  for (const h of history) {
    const payload = JSON.parse(h.payload || '{}');
    csv += [
      h.id,
      h.taskId,
      escapeCsv(h.user?.fullName ?? '—'),
      escapeCsv(h.user?.login ?? '—'),
      escapeCsv(h.operation),
      escapeCsv(payload.title ?? ''),
      escapeCsv(payload.description ?? ''),
      escapeCsv(payload.deadline ?? ''),
      payload.progress ?? '',
      escapeCsv(payload.priority ?? ''),
      escapeCsv(payload.status ?? ''),
      payload.assignedTo ?? '',
      escapeCsv(h.createdAt),
    ].join(';') + '\r\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="softius-tasks.csv"');
  res.send('\uFEFF' + csv);
});

export default router;
