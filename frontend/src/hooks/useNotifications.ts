import { useEffect, useState, useCallback } from 'react';
import { Task } from '../types.js';
import { fetchNotifications } from '../api.js';

export interface NotificationState {
  deadlines: Task[];
  assigned: Task[];
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({ deadlines: [], assigned: [] });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Софтиус Задачи', { body: message, tag: String(Date.now()) });
    }
    setTimeout(() => setToast(null), 5000);
  }, []);

  const check = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setState(data);

      for (const task of data.assigned) {
        showToast(`Вам назначена задача: «${task.title}»`);
      }

      for (const task of data.deadlines) {
        const due = new Date(task.deadline);
        const minutes = Math.max(0, Math.round((due.getTime() - Date.now()) / 60000));
        if (minutes <= 60 && minutes > 0) {
          showToast(`Осталось ${minutes} мин. до сдачи «${task.title}». Отметьте прогресс.`);
        }
      }
    } catch {
      // скип
    }
  }, [showToast]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  return { ...state, toast, setToast, check };
}
