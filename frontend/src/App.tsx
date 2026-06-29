import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, Bell, ShieldCheck } from 'lucide-react';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskProgress,
  exportCsv,
  getMe,
  logout,
  fetchAssignableUsers,
} from './api.js';
import { Task, TaskInput, User, View, HistoryRecordWithUser } from './types.js';
import TaskForm from './components/TaskForm.js';
import TaskList from './components/TaskList.js';
import TaskHistory from './components/TaskHistory.js';
import Login from './components/Login.js';
import Profile from './components/Profile.js';
import Workers from './components/Workers.js';
import HistoryView from './components/HistoryView.js';
import BottomNav from './components/BottomNav.js';
import { useNotifications } from './hooks/useNotifications.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue' | 'my'>('all');
  const [history, setHistory] = useState<HistoryRecordWithUser[] | null>(null);
  const { deadlines, assigned, toast, setToast, check } = useNotifications();

  const loadUser = useCallback(async () => {
    try {
      setLoadingUser(true);
      const { user: me } = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await fetchAssignableUsers();
      setWorkers(data);
    } catch {
      setWorkers([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задачи');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadTasks();
      loadWorkers();
    }
  }, [user, loadTasks, loadWorkers]);

  useEffect(() => {
    if (user && view === 'home') {
      loadWorkers();
      loadTasks();
    }
  }, [view, user, loadWorkers, loadTasks]);

  async function handleLogin() {
    await loadUser();
    setView('home');
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      
    }
    setUser(null);
    setTasks([]);
    setView('home');
  }

  async function handleCreate(input: TaskInput) {
    try {
      setError(null);
      await createTask(input);
      setShowForm(false);
      await loadTasks();
      await check();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания задачи');
    }
  }

  async function handleUpdate(input: TaskInput) {
    if (!editingTask) return;
    try {
      setError(null);
      await updateTask(editingTask.id, input);
      setEditingTask(null);
      setShowForm(false);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления задачи');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить задачу?')) return;
    try {
      setError(null);
      await deleteTask(id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления задачи');
    }
  }

  async function handleProgressChange(id: number, progress: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress } : t))
    );
    try {
      await updateTaskProgress(id, progress);
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const status = progress >= 100 ? 'completed' : t.status === 'completed' ? 'in_progress' : t.status;
          return { ...t, progress, status };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления прогресса');
      await loadTasks();
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function handleNew() {
    setEditingTask(null);
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleExport() {
    try {
      const blob = await exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'softius-tasks.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка экспорта');
    }
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-softius-light rounded-full animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.role === 'admin';
  const notificationCount = deadlines.length + assigned.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20">
      <header className="bg-softius-gradient text-white shadow-lg shadow-blue-900/20 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Софтиус Задачи</h1>
              <p className="text-white/70 text-xs sm:text-sm">Промышленная безопасность</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{user.fullName}</div>
            <div className="text-xs text-white/70">{user.role === 'admin' ? 'Администратор' : 'Работник'}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        {toast && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-slate-800 text-white rounded-2xl shadow-2xl p-4 max-w-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Bell size={16} />
                </div>
                <span className="text-sm leading-relaxed">{toast}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-white/50 hover:text-white p-1">
                ×
              </button>
            </div>
          </div>
        )}

        {view === 'home' && (
          <>
            {notificationCount > 0 && (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Bell size={20} className="text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold">Напоминание</div>
                  <div className="text-sm text-amber-700">
                    {notificationCount} {notificationCount === 1 ? 'уведомление' : notificationCount < 5 ? 'уведомления' : 'уведомлений'} требует внимания
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleNew}
                className="flex-1 sm:flex-none bg-softius-gradient text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Новая задача
              </button>
              <button
                onClick={handleExport}
                className="flex-1 sm:flex-none bg-white text-slate-700 font-semibold px-6 py-3.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Экспорт CSV
              </button>
            </div>

            {showForm && (
              <TaskForm
                task={editingTask}
                workers={workers}
                currentUser={user}
                onSubmit={editingTask ? handleUpdate : handleCreate}
                onCancel={handleCancelForm}
              />
            )}

            {loadingTasks ? (
              <div className="text-center py-16 text-slate-400">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-softius-light rounded-full animate-spin mx-auto mb-3" />
                <p>Загрузка задач...</p>
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                workers={workers}
                currentUser={user}
                filter={filter}
                onFilterChange={setFilter}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onProgressChange={handleProgressChange}
              />
            )}
          </>
        )}

        {view === 'workers' && isAdmin && <Workers currentUser={user} />}

        {view === 'history' && <HistoryView currentUser={user} />}

        {view === 'profile' && (
          <Profile user={user} onUpdate={setUser} onLogout={handleLogout} />
        )}
      </main>

      <BottomNav active={view} onChange={setView} role={user.role} />

      {history && <TaskHistory history={history} currentUser={user} onClose={() => setHistory(null)} />}
    </div>
  );
}
