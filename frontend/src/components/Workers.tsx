import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, User, Briefcase, Phone, MapPin, Shield, UserCircle, X } from 'lucide-react';
import { User as UserType, UserRole } from '../types.js';
import { fetchAllUsers, createUser, deleteUser } from '../api.js';
import { normalizePhone, isValidRussianPhone } from '../utils/phone.js';

interface WorkersProps {
  currentUser: UserType;
}

export default function Workers({ currentUser }: WorkersProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [office, setOffice] = useState('');
  const [role, setRole] = useState<UserRole>('worker');

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function validate(): string[] {
    const errs: string[] = [];
    if (!login.trim() || !/^[a-zA-Z0-9_.-]+$/.test(login.trim())) errs.push('Логин заполнен некорректно');
    if (!password || password.length < 4) errs.push('Пароль минимум 4 символа');
    if (!fullName.trim()) errs.push('ФИО обязательно');
    if (!position.trim()) errs.push('Должность обязательна');
    if (phone && !isValidRussianPhone(phone)) errs.push('Некорректный российский номер телефона');
    return errs;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setError(errs.join('; '));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await createUser({
        login: login.trim(),
        password,
        fullName: fullName.trim(),
        position: position.trim(),
        phone: normalizePhone(phone.trim()),
        office: office.trim(),
        role,
      });
      setLogin('');
      setPassword('');
      setFullName('');
      setPosition('');
      setPhone('');
      setOffice('');
      setRole('worker');
      setShowForm(false);
      setMessage('Сотрудник добавлен');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить сотрудника?')) return;
    if (id === currentUser.id) {
      setError('Нельзя удалить самого себя');
      return;
    }
    try {
      await deleteUser(id);
      setMessage('Сотрудник удалён');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Управление сотрудниками</h2>
            <p className="text-sm text-slate-500">Добавление и удаление пользователей системы</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-softius-gradient text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Добавить</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus size={20} className="text-softius-dark" />
              <h3 className="font-semibold text-slate-800">Добавить сотрудника</h3>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин (латиница)" className="pl-10" />
            </div>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="pl-10" />
            </div>
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ФИО" className="pl-10" />
            </div>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Должность" className="pl-10" />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => phone && setPhone(normalizePhone(phone))}
                placeholder="Телефон"
                className="pl-10"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={office} onChange={(e) => setOffice(e.target.value)} placeholder="Кабинет" className="pl-10" />
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="worker">Работник</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-softius-gradient text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Добавить сотрудника
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 card-hover">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <User size={24} className="text-slate-500" />
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
              }`}>
                <Shield size={10} />
                {u.role === 'admin' ? 'Админ' : 'Работник'}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{u.fullName}</h3>
            <p className="text-sm text-slate-500 mb-4">{u.position}</p>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <UserCircle size={14} className="text-slate-400" />
                <span>{u.login}</span>
              </div>
              {u.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span>{u.phone}</span>
                </div>
              )}
              {u.office && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span>Каб. {u.office}</span>
                </div>
              )}
            </div>
            {u.id !== currentUser.id && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleDelete(u.id)}
                  className="w-full flex items-center justify-center gap-2 text-red-600 font-medium py-2 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Users size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Нет сотрудников</p>
        </div>
      )}
    </div>
  );
}
