import { useState, useEffect, useMemo } from 'react';
import { Type, AlignLeft, Calendar, Flag, Users, Percent, X, CheckCircle2, Search } from 'lucide-react';
import { Task, TaskInput, User } from '../types.js';

interface TaskFormProps {
  task?: Task | null;
  workers: User[];
  currentUser: User;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
}

function toDatetimeLocal(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TaskForm({ task, workers, currentUser, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [progress, setProgress] = useState(0);
  const [priority, setPriority] = useState<TaskInput['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const availableWorkers = workers.length > 0 ? workers : [currentUser];

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableWorkers;
    return availableWorkers.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q) ||
        w.login.toLowerCase().includes(q)
    );
  }, [availableWorkers, search]);

  const selectedWorker = availableWorkers.find((w) => w.id === assignedTo);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDeadline(toDatetimeLocal(task.deadline));
      setProgress(task.progress);
      setPriority(task.priority);
      setAssignedTo(task.assignedTo ?? currentUser.id);
      setSearch('');
    } else {
      setTitle('');
      setDescription('');
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      setDeadline(toDatetimeLocal(now.toISOString()));
      setProgress(0);
      setPriority('medium');
      setAssignedTo(currentUser.id);
      setSearch('');
    }
    setErrors([]);
  }, [task, currentUser.id]);

  function validate(): string[] {
    const list: string[] = [];
    const trimmedTitle = title.trim();
    if (!trimmedTitle) list.push('Название задачи обязательно');
    else if (trimmedTitle.length > 200) list.push('Название не должно превышать 200 символов');
    if (description.length > 4000) list.push('Описание не должно превышать 4000 символов');
    if (!deadline) list.push('Срок выполнения обязателен');
    else if (Number.isNaN(Date.parse(deadline))) list.push('Указана некорректная дата');
    if (progress < 0 || progress > 100) list.push('Прогресс должен быть от 0 до 100');
    return list;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const list = validate();
    if (list.length > 0) {
      setErrors(list);
      return;
    }
    const input: TaskInput = {
      title: title.trim(),
      description: description.trim(),
      deadline,
      progress,
      priority,
    };
    if (isAdmin) {
      input.assignedTo = assignedTo ?? currentUser.id;
    }
    onSubmit(input);
  }

  const priorityOptions = [
    { value: 'low', label: 'Низкий', color: 'text-blue-600 bg-blue-50' },
    { value: 'medium', label: 'Средний', color: 'text-amber-600 bg-amber-50' },
    { value: 'high', label: 'Высокий', color: 'text-red-600 bg-red-50' },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
          <ul className="space-y-1">
            {errors.map((err, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Type size={14} /> Название
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например, Проверка средств индивидуальной защиты"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <AlignLeft size={14} /> Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробности задачи"
          rows={3}
          maxLength={4000}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Calendar size={14} /> Срок выполнения
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Flag size={14} /> Приоритет
          </label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskInput['priority'])}>
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-1.5 relative">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Users size={14} /> Исполнитель
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <span className={selectedWorker ? 'text-slate-800' : 'text-slate-400'}>
              {selectedWorker ? `${selectedWorker.fullName} — ${selectedWorker.position}` : 'Выберите исполнителя'}
            </span>
            <Search size={16} className="text-slate-400" />
          </button>
          {dropdownOpen && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по ФИО, должности, логину..."
                    className="pl-9 py-2 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto no-scrollbar">
                {filteredWorkers.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setAssignedTo(w.id);
                      setDropdownOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                      assignedTo === w.id ? 'bg-softius-light/5' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{w.fullName}</div>
                      <div className="text-xs text-slate-500">{w.position} • {w.login}</div>
                    </div>
                    {assignedTo === w.id && <CheckCircle2 size={16} className="text-softius-dark" />}
                  </button>
                ))}
                {filteredWorkers.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-400">Ничего не найдено</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 bg-slate-50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Percent size={14} /> Прогресс выполнения
          </label>
          <span className="text-sm font-bold text-softius-dark">{progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-softius-light"
        />
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-softius-gradient transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-softius-gradient text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} />
          {task ? 'Сохранить изменения' : 'Создать задачу'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-all duration-200"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
