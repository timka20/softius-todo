export type UserRole = 'admin' | 'worker';

export interface User {
  id: number;
  login: string;
  fullName: string;
  position: string;
  phone: string;
  office: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  login: string;
  fullName: string;
  position: string;
  phone: string;
  office: string;
  role: UserRole;
  password: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  createdBy: number;
  assignedTo: number | null;
  assignedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  deadline: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: number | null;
}

export interface HistoryRecord {
  id: number;
  taskId: number;
  userId: number | null;
  operation: 'create' | 'update' | 'delete' | 'progress';
  payload: string;
  createdAt: string;
}

export interface HistoryRecordWithUser extends HistoryRecord {
  user: User | null;
}

export interface ApiError {
  error: string;
  details?: string[];
}

export type View = 'home' | 'workers' | 'history' | 'profile';
