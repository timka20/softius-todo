import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Task, TaskInput, HistoryRecord, HistoryRecordWithUser, User, UserInput, UserProfileInput, UserRole, Session } from './types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '..', 'base.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SALT_ROUNDS = 10;
const SESSION_DAYS = 7;

function columnExists(table: string, column: string): boolean {
  const info = db.pragma(`table_info(${table})`) as any[];
  return info.some((col) => col.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    office TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'worker' CHECK(role IN ('admin', 'worker')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    deadline TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'overdue')),
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    assigned_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER,
    operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete', 'progress')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_history_task_id ON task_history(task_id);
  CREATE INDEX IF NOT EXISTS idx_history_user_id ON task_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`);

if (!columnExists('task_history', 'user_id')) {
  db.exec('ALTER TABLE task_history ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  db.exec('CREATE INDEX IF NOT EXISTS idx_history_user_id ON task_history(user_id)');
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    const body = digits.slice(1);
    return `+7 (${body.slice(0, 3)}) ${body.slice(3, 6)}-${body.slice(6, 8)}-${body.slice(8, 10)}`;
  }
  return phone;
}

export function isValidRussianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8')));
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    login: row.login,
    fullName: row.full_name,
    position: row.position,
    phone: row.phone,
    office: row.office,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deadline: row.deadline,
    progress: row.progress,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHistory(row: any): HistoryRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    operation: row.operation,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function computeStatus(progress: number, deadline: string): Task['status'] {
  if (progress >= 100) return 'completed';
  const now = new Date();
  const due = new Date(deadline);
  if (due < now) return 'overdue';
  if (progress > 0) return 'in_progress';
  return 'pending';
}

// пользователи
export function createUser(input: UserInput): User {
  const hash = bcrypt.hashSync(input.password, SALT_ROUNDS);
  const phone = normalizePhone(input.phone);
  const result = db.prepare(`
    INSERT INTO users (login, password_hash, full_name, position, phone, office, role)
    VALUES (@login, @hash, @fullName, @position, @phone, @office, @role)
  `).run({
    login: input.login,
    hash,
    fullName: input.fullName,
    position: input.position,
    phone,
    office: input.office,
    role: input.role,
  });
  return getUserById(Number(result.lastInsertRowid))!;
}

export function ensureInitialAdmin(): void {
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!admin) {
    createUser({
      login: 'admin',
      password: 'admin',
      fullName: 'Администратор',
      position: 'Администратор системы',
      phone: '',
      office: '',
      role: 'admin',
    });
    console.log('Created default admin: admin / admin');
  }
}

export function getUserById(id: number): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? rowToUser(row) : null;
}

export function getUserByLogin(login: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as any;
  return row ? rowToUser(row) : null;
}

export function getUserWithPassword(login: string): { user: User; passwordHash: string } | null {
  const row = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as any;
  if (!row) return null;
  return { user: rowToUser(row), passwordHash: row.password_hash };
}

export function getAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY full_name ASC').all() as any[];
  return rows.map(rowToUser);
}

export function getWorkers(): User[] {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'worker' ORDER BY full_name ASC").all() as any[];
  return rows.map(rowToUser);
}

export function getAssignableUsers(): User[] {
  const rows = db.prepare("SELECT * FROM users ORDER BY full_name ASC").all() as any[];
  return rows.map(rowToUser);
}

export function updateUserProfile(id: number, input: UserProfileInput): User | null {
  const phone = normalizePhone(input.phone);
  const result = db.prepare(`
    UPDATE users
    SET full_name = @fullName,
        position = @position,
        phone = @phone,
        office = @office,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, ...input, phone });
  if (result.changes === 0) return null;
  return getUserById(id);
}

export function updateUserPassword(id: number, password: string): boolean {
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db.prepare(`
    UPDATE users SET password_hash = @hash, updated_at = datetime('now') WHERE id = @id
  `).run({ id, hash });
  return result.changes > 0;
}

export function deleteUser(id: number): boolean {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (@userId, @token, @expiresAt)
  `).run({ userId, token, expiresAt: expiresAt.toISOString() });
  return token;
}

export function getSession(token: string): Session | null {
  const row = db.prepare(`
    SELECT * FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')
  `).get(token) as any;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteUserSessions(userId: number): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// задачки
export function createTask(input: TaskInput & { createdBy: number; assignedBy?: number | null }, userId: number): Task {
  const status = computeStatus(input.progress, input.deadline);
  const result = db.prepare(`
    INSERT INTO tasks (title, description, deadline, progress, priority, status, created_by, assigned_to, assigned_by)
    VALUES (@title, @description, @deadline, @progress, @priority, @status, @createdBy, @assignedTo, @assignedBy)
  `).run({
    title: input.title,
    description: input.description,
    deadline: input.deadline,
    progress: input.progress,
    priority: input.priority,
    status,
    createdBy: input.createdBy,
    assignedTo: input.assignedTo ?? null,
    assignedBy: input.assignedBy ?? null,
  });
  const id = Number(result.lastInsertRowid);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  db.prepare(`
    INSERT INTO task_history (task_id, user_id, operation, payload)
    VALUES (@taskId, @userId, 'create', @payload)
  `).run({ taskId: id, userId, payload: JSON.stringify(rowToTask(task)) });
  return rowToTask(task);
}

export function updateTask(
  id: number,
  input: TaskInput & { assignedBy?: number | null },
  userId: number,
  options: { canReassign?: boolean } = {}
): Task | null {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!existing) return null;
  const status = computeStatus(input.progress, input.deadline);
  const assignedTo = options.canReassign ? (input.assignedTo ?? existing.assigned_to) : existing.assigned_to;
  const assignedBy = options.canReassign && input.assignedTo !== existing.assigned_to
    ? (input.assignedBy ?? existing.assigned_by)
    : existing.assigned_by;

  db.prepare(`
    UPDATE tasks
    SET title = @title,
        description = @description,
        deadline = @deadline,
        progress = @progress,
        priority = @priority,
        status = @status,
        assigned_to = @assignedTo,
        assigned_by = @assignedBy,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    title: input.title,
    description: input.description,
    deadline: input.deadline,
    progress: input.progress,
    priority: input.priority,
    status,
    assignedTo,
    assignedBy,
  });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  db.prepare(`
    INSERT INTO task_history (task_id, user_id, operation, payload)
    VALUES (@taskId, @userId, 'update', @payload)
  `).run({ taskId: id, userId, payload: JSON.stringify(rowToTask(task)) });
  return rowToTask(task);
}

export function updateTaskProgress(id: number, progress: number, userId: number): Task | null {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!existing) return null;
  const status = computeStatus(progress, existing.deadline);
  db.prepare(`
    UPDATE tasks SET progress = @progress, status = @status, updated_at = datetime('now') WHERE id = @id
  `).run({ id, progress, status });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  db.prepare(`
    INSERT INTO task_history (task_id, user_id, operation, payload)
    VALUES (@taskId, @userId, 'progress', @payload)
  `).run({ taskId: id, userId, payload: JSON.stringify(rowToTask(task)) });
  return rowToTask(task);
}

export function deleteTask(id: number, userId: number): boolean {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!existing) return false;
  db.prepare(`
    INSERT INTO task_history (task_id, user_id, operation, payload)
    VALUES (@taskId, @userId, 'delete', @payload)
  `).run({ taskId: id, userId, payload: JSON.stringify(rowToTask(existing)) });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return true;
}

export function getTaskById(id: number): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  return row ? rowToTask(row) : null;
}

export function getTasksForUser(userId: number, role: UserRole): Task[] {
  refreshStatuses();
  if (role === 'admin') {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY deadline ASC, created_at DESC').all() as any[];
    return rows.map(rowToTask);
  }
  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE created_by = @userId OR assigned_to = @userId OR assigned_to IS NULL
    ORDER BY deadline ASC, created_at DESC
  `).all({ userId }) as any[];
  return rows.map(rowToTask);
}

export function getTaskHistory(taskId: number, currentUserId: number, role: UserRole): HistoryRecordWithUser[] {
  let rows: any[];
  if (role === 'admin') {
    rows = db.prepare(`
      SELECT h.*, u.login as user_login, u.full_name as user_full_name, u.role as user_role
      FROM task_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.task_id = ?
      ORDER BY h.created_at DESC
    `).all(taskId) as any[];
  } else {
    rows = db.prepare(`
      SELECT h.*, u.login as user_login, u.full_name as user_full_name, u.role as user_role
      FROM task_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.task_id = ? AND h.user_id = ?
      ORDER BY h.created_at DESC
    `).all(taskId, currentUserId) as any[];
  }
  return rows.map((row) => ({
    ...rowToHistory(row),
    user: row.user_id ? {
      id: row.user_id,
      login: row.user_login,
      fullName: row.user_full_name,
      role: row.user_role,
      position: '',
      phone: '',
      office: '',
      createdAt: '',
      updatedAt: '',
    } : null,
  }));
}

export function getAllHistory(currentUserId: number, role: UserRole): HistoryRecordWithUser[] {
  let rows: any[];
  if (role === 'admin') {
    rows = db.prepare(`
      SELECT h.*, u.login as user_login, u.full_name as user_full_name, u.role as user_role
      FROM task_history h
      LEFT JOIN users u ON h.user_id = u.id
      ORDER BY h.created_at DESC
    `).all() as any[];
  } else {
    rows = db.prepare(`
      SELECT h.*, u.login as user_login, u.full_name as user_full_name, u.role as user_role
      FROM task_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC
    `).all(currentUserId) as any[];
  }
  return rows.map((row) => ({
    ...rowToHistory(row),
    user: row.user_id ? {
      id: row.user_id,
      login: row.user_login,
      fullName: row.user_full_name,
      role: row.user_role,
      position: '',
      phone: '',
      office: '',
      createdAt: '',
      updatedAt: '',
    } : null,
  }));
}

export function getUpcomingDeadlines(userId: number, role: UserRole, hours = 24): Task[] {
  refreshStatuses();
  const future = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  let rows: any[];
  if (role === 'admin') {
    rows = db.prepare(`
      SELECT * FROM tasks
      WHERE progress < 100
        AND datetime(deadline) > datetime('now')
        AND datetime(deadline) <= datetime(@future)
      ORDER BY deadline ASC
    `).all({ future }) as any[];
  } else {
    rows = db.prepare(`
      SELECT * FROM tasks
      WHERE progress < 100
        AND datetime(deadline) > datetime('now')
        AND datetime(deadline) <= datetime(@future)
        AND (created_by = @userId OR assigned_to = @userId)
      ORDER BY deadline ASC
    `).all({ future, userId }) as any[];
  }
  return rows.map(rowToTask);
}

export function getRecentlyAssignedTasks(userId: number, minutes = 5): Task[] {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE assigned_to = @userId
      AND datetime(created_at) >= datetime(@since)
    ORDER BY created_at DESC
  `).all({ userId, since }) as any[];
  return rows.map(rowToTask);
}

export function refreshStatuses(): void {
  const tasks = db.prepare('SELECT * FROM tasks').all() as any[];
  const stmt = db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?");
  for (const row of tasks) {
    const newStatus = computeStatus(row.progress, row.deadline);
    if (newStatus !== row.status) {
      stmt.run(newStatus, row.id);
    }
  }
}

export { db };
