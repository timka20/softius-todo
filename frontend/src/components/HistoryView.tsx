import { useEffect, useState } from 'react';
import { History, Plus, Pencil, Trash2, Percent, Clock, User } from 'lucide-react';
import { HistoryRecordWithUser, User as UserType } from '../types.js';
import { fetchHistory } from '../api.js';

interface HistoryViewProps {
  currentUser: UserType;
}

const operationConfig: Record<HistoryRecordWithUser['operation'], { label: string; icon: typeof Plus; class: string }> = {
  create: { label: 'Создание', icon: Plus, class: 'bg-emerald-50 text-emerald-600' },
  update: { label: 'Изменение', icon: Pencil, class: 'bg-blue-50 text-blue-600' },
  delete: { label: 'Удаление', icon: Trash2, class: 'bg-red-50 text-red-600' },
  progress: { label: 'Прогресс', icon: Percent, class: 'bg-purple-50 text-purple-600' },
};

export default function HistoryView({ currentUser }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryRecordWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHistory();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-softius-gradient flex items-center justify-center shadow-lg shadow-blue-500/20">
          <History className="text-white" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">История изменений</h2>
          <p className="text-sm text-slate-500">
            {currentUser.role === 'admin' ? 'Все операции в системе' : 'Ваши операции'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-softius-light rounded-full animate-spin mx-auto mb-3" />
          <p>Загрузка истории...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const payload = JSON.parse(record.payload || '{}');
            const config = operationConfig[record.operation];
            const Icon = config.icon;
            return (
              <div key={record.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ${config.class}`}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{payload.title || `Задача #${record.taskId}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={12} />
                    {new Date(record.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                  {payload.progress !== undefined && (
                    <div>Прогресс: <span className="font-semibold text-slate-800">{payload.progress}%</span></div>
                  )}
                  {payload.status && (
                    <div>Статус: <span className="font-semibold text-slate-800">{payload.status == "in_progress" ? "В процессе" : payload.status == "pending" ? "Создана" : "Выполнено"}</span></div>
                  )}
                  {payload.priority && (
                    <div>Приоритет: <span className="font-semibold text-slate-800">{payload.priority == "high" ? "Высокий" : payload.priority == "medium" ? "Средний" : "Низний" }</span></div>
                  )}
                  {payload.deadline && (
                    <div>Срок: <span className="font-semibold text-slate-800">{new Date(payload.deadline).toLocaleString('ru-RU')}</span></div>
                  )}
                </div>
                {currentUser.role === 'admin' && record.user && (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-sm text-slate-500">
                    <User size={14} />
                    <span>{record.user.fullName}</span>
                    <span className="text-slate-300">•</span>
                    <span>{record.user.login}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${record.user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {record.user.role === 'admin' ? 'Админ' : 'Работник'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {history.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
              <History size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400">История пуста</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
