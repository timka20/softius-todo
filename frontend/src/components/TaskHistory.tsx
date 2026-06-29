import { X, Plus, Pencil, Trash2, Percent, History, User } from 'lucide-react';
import { HistoryRecordWithUser, User as UserType } from '../types.js';

interface TaskHistoryProps {
  history: HistoryRecordWithUser[];
  currentUser: UserType;
  onClose: () => void;
}

const operationConfig: Record<HistoryRecordWithUser['operation'], { label: string; icon: typeof Plus; class: string }> = {
  create: { label: 'Создание', icon: Plus, class: 'bg-emerald-50 text-emerald-600' },
  update: { label: 'Изменение', icon: Pencil, class: 'bg-blue-50 text-blue-600' },
  delete: { label: 'Удаление', icon: Trash2, class: 'bg-red-50 text-red-600' },
  progress: { label: 'Прогресс', icon: Percent, class: 'bg-purple-50 text-purple-600' },
};

export default function TaskHistory({ history, currentUser, onClose }: TaskHistoryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History size={20} className="text-softius-dark" />
            <h2 className="text-lg font-bold text-slate-800">История изменений</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3 no-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History size={40} className="mx-auto mb-3 text-slate-300" />
              <p>История пуста</p>
            </div>
          ) : (
            history.map((record) => {
              const payload = JSON.parse(record.payload || '{}');
              const config = operationConfig[record.operation];
              const Icon = config.icon;
              return (
                <div key={record.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.class}`}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(record.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    {payload.title ? `«${payload.title}»` : `Задача #${record.taskId}`}
                  </div>
                  {payload.progress !== undefined && (
                    <div className="text-sm text-slate-500 mt-1">Прогресс: {payload.progress}%</div>
                  )}
                  {currentUser.role === 'admin' && record.user && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                      <User size={12} />
                      <span>{record.user.fullName} ({record.user.login})</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
