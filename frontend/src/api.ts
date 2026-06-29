import { Task, TaskInput, HistoryRecordWithUser, User, UserInput, UserRole } from './types.js';

const API_BASE = import.meta.env.DEV ? '/api' : 'http://localhost:14365';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Ошибка ${response.status}`;
    try {
      const data = await response.json();
      if (data.details && Array.isArray(data.details) && data.details.length > 0) {
        message = data.details.join('; ');
      } else if (data.error) {
        message = data.error;
      }
    } catch {
      // скип
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function request(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function login(login: string, password: string): Promise<{ user: User }> {
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
  return handleResponse<{ user: User }>(response);
}

export async function logout(): Promise<void> {
  const response = await request('/auth/logout', { method: 'POST' });
  return handleResponse<void>(response);
}

export async function getMe(): Promise<{ user: User }> {
  const response = await request('/auth/me');
  return handleResponse<{ user: User }>(response);
}

export async function updateProfile(input: { fullName: string; position: string; phone: string; office: string }): Promise<{ user: User }> {
  const response = await request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return handleResponse<{ user: User }>(response);
}

export async function changePassword(password: string): Promise<{ ok: boolean; message?: string }> {
  const response = await request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
  return handleResponse<{ ok: boolean; message?: string }>(response);
}

export async function fetchAssignableUsers(): Promise<User[]> {
  const response = await request('/assignable-users');
  return handleResponse<User[]>(response);
}

export async function fetchWorkers(): Promise<User[]> {
  const response = await request('/workers');
  return handleResponse<User[]>(response);
}

export async function fetchAllUsers(): Promise<User[]> {
  const response = await request('/users');
  return handleResponse<User[]>(response);
}

export async function createUser(input: UserInput): Promise<User> {
  const response = await request('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return handleResponse<User>(response);
}

export async function deleteUser(id: number): Promise<void> {
  const response = await request(`/users/${id}`, { method: 'DELETE' });
  return handleResponse<void>(response);
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await request('/tasks');
  return handleResponse<Task[]>(response);
}

export async function fetchTask(id: number): Promise<Task> {
  const response = await request(`/tasks/${id}`);
  return handleResponse<Task>(response);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const response = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return handleResponse<Task>(response);
}

export async function updateTask(id: number, input: TaskInput): Promise<Task> {
  const response = await request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return handleResponse<Task>(response);
}

export async function updateTaskProgress(id: number, progress: number): Promise<Task> {
  const response = await request(`/tasks/${id}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ progress }),
  });
  return handleResponse<Task>(response);
}

export async function deleteTask(id: number): Promise<void> {
  const response = await request(`/tasks/${id}`, { method: 'DELETE' });
  return handleResponse<void>(response);
}

export async function fetchTaskHistory(id: number): Promise<HistoryRecordWithUser[]> {
  const response = await request(`/tasks/${id}/history`);
  return handleResponse<HistoryRecordWithUser[]>(response);
}

export async function fetchHistory(): Promise<HistoryRecordWithUser[]> {
  const response = await request('/history');
  return handleResponse<HistoryRecordWithUser[]>(response);
}

export interface NotificationsResult {
  deadlines: Task[];
  assigned: Task[];
}

export async function fetchNotifications(): Promise<NotificationsResult> {
  const response = await request('/tasks/notifications');
  return handleResponse<NotificationsResult>(response);
}

export async function exportCsv(): Promise<Blob> {
  const response = await request('/export/csv');
  if (!response.ok) {
    throw new Error(`Ошибка экспорта: ${response.status}`);
  }
  return response.blob();
}

export type { UserRole };
