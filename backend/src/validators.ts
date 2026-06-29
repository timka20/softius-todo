import { TaskInput, UserInput, UserProfileInput, UserRole } from './types.js';
import { isValidRussianPhone, normalizePhone } from './db.js';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 4000;
const MAX_LOGIN = 50;
const MAX_NAME = 200;
const MAX_POSITION = 200;
const MAX_OFFICE = 50;
const MIN_PASSWORD = 4;

export function validateTaskInput(data: unknown): { valid: true; data: TaskInput } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    errors.push('Тело запроса должно быть объектом JSON');
    return { valid: false, errors };
  }

  const input = data as Record<string, unknown>;

  const title = String(input.title ?? '').trim();
  if (!title) {
    errors.push('Название задачи обязательно');
  } else if (title.length > MAX_TITLE) {
    errors.push(`Название не должно превышать ${MAX_TITLE} символов`);
  }

  const description = String(input.description ?? '').trim();
  if (description.length > MAX_DESCRIPTION) {
    errors.push(`Описание не должно превышать ${MAX_DESCRIPTION} символов`);
  }

  const deadline = String(input.deadline ?? '').trim();
  if (!deadline) {
    errors.push('Срок выполнения обязателен');
  } else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadline)) {
    errors.push('Срок выполнения должен быть в формате YYYY-MM-DDTHH:mm');
  } else if (Number.isNaN(Date.parse(deadline))) {
    errors.push('Указана некорректная дата');
  }

  const progress = Number(input.progress ?? NaN);
  if (Number.isNaN(progress) || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    errors.push('Прогресс должен быть целым числом от 0 до 100');
  }

  const priority = String(input.priority ?? '').trim().toLowerCase();
  if (!['low', 'medium', 'high'].includes(priority)) {
    errors.push('Приоритет должен быть one of: low, medium, high');
  }

  let assignedTo: number | null | undefined = undefined;
  if ('assignedTo' in input && input.assignedTo !== null && input.assignedTo !== undefined) {
    assignedTo = Number(input.assignedTo);
    if (Number.isNaN(assignedTo) || !Number.isInteger(assignedTo) || assignedTo <= 0) {
      errors.push('Идентификатор исполнителя должен быть положительным числом');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      title,
      description,
      deadline,
      progress,
      priority: priority as 'low' | 'medium' | 'high',
      assignedTo,
    },
  };
}

export function validateUserInput(data: unknown): { valid: true; data: UserInput } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    errors.push('Тело запроса должно быть объектом JSON');
    return { valid: false, errors };
  }

  const input = data as Record<string, unknown>;

  const login = String(input.login ?? '').trim();
  if (!login) {
    errors.push('Логин обязателен');
  } else if (login.length > MAX_LOGIN) {
    errors.push(`Логин не должен превышать ${MAX_LOGIN} символов`);
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(login)) {
    errors.push('Логин может содержать только латинские буквы, цифры, точки и подчёркивания');
  }

  const password = String(input.password ?? '');
  if (!password) {
    errors.push('Пароль обязателен');
  } else if (password.length < MIN_PASSWORD) {
    errors.push(`Пароль должен содержать не менее ${MIN_PASSWORD} символов`);
  }

  const fullName = String(input.fullName ?? '').trim();
  if (!fullName) {
    errors.push('ФИО обязательно');
  } else if (fullName.length > MAX_NAME) {
    errors.push(`ФИО не должно превышать ${MAX_NAME} символов`);
  }

  const position = String(input.position ?? '').trim();
  if (!position) {
    errors.push('Должность обязательна');
  } else if (position.length > MAX_POSITION) {
    errors.push(`Должность не должна превышать ${MAX_POSITION} символов`);
  }

  const phoneRaw = String(input.phone ?? '').trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : '';
  if (phoneRaw && !isValidRussianPhone(phoneRaw)) {
    errors.push('Номер телефона должен быть российским (например, +7 (999) 123-45-67)');
  }

  const office = String(input.office ?? '').trim();
  if (office.length > MAX_OFFICE) {
    errors.push(`Кабинет не должен превышать ${MAX_OFFICE} символов`);
  }

  const role = String(input.role ?? '').trim().toLowerCase();
  if (!['admin', 'worker'].includes(role)) {
    errors.push('Роль должна быть admin или worker');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      login,
      password,
      fullName,
      position,
      phone,
      office,
      role: role as UserRole,
    },
  };
}

export function validateProfileInput(data: unknown): { valid: true; data: UserProfileInput } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (data === null || typeof data !== 'object') {
    errors.push('Тело запроса должно быть объектом JSON');
    return { valid: false, errors };
  }

  const input = data as Record<string, unknown>;

  const fullName = String(input.fullName ?? '').trim();
  if (!fullName) {
    errors.push('ФИО обязательно');
  } else if (fullName.length > MAX_NAME) {
    errors.push(`ФИО не должно превышать ${MAX_NAME} символов`);
  }

  const position = String(input.position ?? '').trim();
  if (!position) {
    errors.push('Должность обязательна');
  } else if (position.length > MAX_POSITION) {
    errors.push(`Должность не должна превышать ${MAX_POSITION} символов`);
  }

  const phoneRaw = String(input.phone ?? '').trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : '';
  if (phoneRaw && !isValidRussianPhone(phoneRaw)) {
    errors.push('Номер телефона должен быть российским (например, +7 (999) 123-45-67)');
  }

  const office = String(input.office ?? '').trim();
  if (office.length > MAX_OFFICE) {
    errors.push(`Кабинет не должен превышать ${MAX_OFFICE} символов`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { fullName, position, phone, office },
  };
}

export function validatePasswordChange(data: unknown): { valid: true; password: string } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  if (data === null || typeof data !== 'object') {
    errors.push('Тело запроса должно быть объектом JSON');
    return { valid: false, errors };
  }
  const password = String((data as Record<string, unknown>).password ?? '');
  if (!password) {
    errors.push('Пароль обязателен');
  } else if (password.length < MIN_PASSWORD) {
    errors.push(`Пароль должен содержать не менее ${MIN_PASSWORD} символов`);
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, password };
}

export function validateIdParam(id: string): number | null {
  const parsed = Number(id);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
