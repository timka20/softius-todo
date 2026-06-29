import { useState, useEffect } from 'react';
import { User, Briefcase, Phone, MapPin, Save, KeyRound, LogOut, Mail } from 'lucide-react';
import { User as UserType } from '../types.js';
import { updateProfile, changePassword } from '../api.js';
import { normalizePhone, isValidRussianPhone } from '../utils/phone.js';

interface ProfileProps {
  user: UserType;
  onUpdate: (user: UserType) => void;
  onLogout: () => void;
}

export default function Profile({ user, onUpdate, onLogout }: ProfileProps) {
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [office, setOffice] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setPosition(user.position);
    setPhone(user.phone);
    setOffice(user.office);
  }, [user]);

  function validateProfile(): string[] {
    const errs: string[] = [];
    if (!fullName.trim()) errs.push('ФИО обязательно');
    if (!position.trim()) errs.push('Должность обязательна');
    if (phone && !isValidRussianPhone(phone)) errs.push('Некорректный российский номер телефона');
    return errs;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateProfile();
    if (errs.length > 0) {
      setError(errs.join('; '));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { user: updated } = await updateProfile({
        fullName: fullName.trim(),
        position: position.trim(),
        phone: normalizePhone(phone.trim()),
        office: office.trim(),
      });
      onUpdate(updated);
      setPhone(updated.phone);
      setMessage('Профиль сохранён');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setError('Пароль должен содержать не менее 4 символов');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setMessage('Пароль изменён. Войдите заново.');
      setTimeout(() => onLogout(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div className="bg-softius-gradient rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <p className="text-white/80 text-sm">{user.position}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
              <span className="flex items-center gap-1"><Mail size={12} /> {user.login}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20">
                {user.role === 'admin' ? 'Администратор' : 'Работник'}
              </span>
            </div>
          </div>
        </div>
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

      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <User size={20} className="text-softius-dark" />
          <h3 className="font-semibold text-slate-800">Редактировать профиль</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <User size={14} /> ФИО
            </label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Briefcase size={14} /> Должность
            </label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Phone size={14} /> Телефон
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => phone && setPhone(normalizePhone(phone))}
              placeholder="+7 (999) 123-45-67"
            />
            {phone && !isValidRussianPhone(phone) && (
              <p className="text-xs text-red-500">Введите российский номер</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <MapPin size={14} /> Кабинет
            </label>
            <input value={office} onChange={(e) => setOffice(e.target.value)} />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-softius-gradient text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Сохранить профиль
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={20} className="text-softius-dark" />
          <h3 className="font-semibold text-slate-800">Сменить пароль</h3>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">Новый пароль</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 4 символа"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 text-white font-medium py-3 rounded-xl hover:bg-slate-700 disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <KeyRound size={18} />
          Изменить пароль
        </button>
      </form>

      <button
        onClick={onLogout}
        className="w-full bg-red-50 text-red-600 font-medium py-3.5 rounded-xl hover:bg-red-100 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Выйти
      </button>
    </div>
  );
}
