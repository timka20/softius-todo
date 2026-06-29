import { LayoutGrid, CheckCircle2, AlertCircle, Clock, UserCircle } from 'lucide-react';
import { Task, User } from '../types.js';
import TaskCard from './TaskCard.js';

interface TaskListProps {
  tasks: Task[];
  workers: User[];
  currentUser: User;
  filter: 'all' | 'active' | 'completed' | 'overdue' | 'my';
  onFilterChange: (filter: 'all' | 'active' | 'completed' | 'overdue' | 'my') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onProgressChange: (id: number, progress: number) => void;
}

export default function TaskList({
  tasks,
  workers,
  currentUser,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onProgressChange,
}: TaskListProps) {
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'overdue') return task.status === 'overdue';
    if (filter === 'my') return task.assignedTo === currentUser.id || task.createdBy === currentUser.id;
    return true;
  });

  const filterButtons: { key: typeof filter; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'all', label: 'Все', icon: LayoutGrid },
    { key: 'my', label: 'Мои', icon: UserCircle },
    { key: 'active', label: 'Активные', icon: Clock },
    { key: 'completed', label: 'Выполненные', icon: CheckCircle2 },
    { key: 'overdue', label: 'Просроченные', icon: AlertCircle },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => {
            const isActive = filter === btn.key;
            const Icon = btn.icon;
            return (
              <button
                key={btn.key}
                onClick={() => onFilterChange(btn.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-softius-gradient text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} />
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">Задачи не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              workers={workers}
              currentUser={currentUser}
              onEdit={onEdit}
              onDelete={onDelete}
              onProgressChange={onProgressChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
