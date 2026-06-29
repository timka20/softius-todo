import { Calendar, Flag, User, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Task, User as UserType } from '../types.js';

interface TaskCardProps {
  task: Task;
  workers: UserType[];
  currentUser: UserType;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onProgressChange: (id: number, progress: number) => void;
}

const statusConfig: Record<Task['status'], { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: 'В ожидании', class: 'bg-slate-100 text-slate-600', icon: Clock },
  in_progress: { label: 'В работе', class: 'bg-blue-50 text-blue-600', icon: Loader2 },
  completed: { label: 'Выполнена', class: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  overdue: { label: 'Просрочена', class: 'bg-red-50 text-red-600', icon: AlertCircle },
};

const priorityConfig: Record<Task['priority'], { label: string; class: string }> = {
  low: { label: 'Низкий', class: 'bg-blue-50 text-blue-600' },
  medium: { label: 'Средний', class: 'bg-amber-50 text-amber-600' },
  high: { label: 'Высокий', class: 'bg-red-50 text-red-600' },
};

export default function TaskCard({ task, workers, currentUser, onEdit, onDelete, onProgressChange }: TaskCardProps) {
  const deadline = new Date(task.deadline);
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;
  const assignee = workers.find((w) => w.id === task.assignedTo);
  const isAdmin = currentUser.role === 'admin';
  const canDelete = isAdmin;
  const canEdit = isAdmin || task.assignedTo === currentUser.id || task.createdBy === currentUser.id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4 card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800 leading-tight" title={task.title}>
            {task.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description || 'Без описания'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap ${status.class}`}>
          <StatusIcon size={12} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium ${priorityConfig[task.priority].class}`}>
          <Flag size={12} />
          {priorityConfig[task.priority].label}
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium ${task.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
          <Calendar size={12} />
          {deadline.toLocaleString('ru-RU')}
        </span>
        {assignee && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium bg-softius-light/10 text-softius-dark">
            <User size={12} />
            {assignee.fullName}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600 font-medium">Прогресс</span>
          <span className="font-bold text-softius-dark">{task.progress}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-softius-gradient transition-all duration-300 rounded-full"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        
      </div>

      <div className="flex gap-2 pt-1">
        {canEdit && (
          <button
            onClick={() => onEdit(task)}
            className="flex-1 bg-softius-light/10 text-softius-dark font-medium py-2.5 rounded-xl hover:bg-softius-light/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Pencil size={16} />
            Редактировать
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="flex-1 bg-red-50 text-red-600 font-medium py-2.5 rounded-xl hover:bg-red-100 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
