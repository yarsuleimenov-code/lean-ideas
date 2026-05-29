export const CONFIG = {
  WEB_APP_URL: '',
  ADMIN_TOKEN_STORAGE_KEY: 'zaberman_lean_admin_token',
  REQUEST_TIMEOUT_MS: 30000,
  TEXT_LIMITS: {
    currentSituation: 1000,
    problem: 1000,
    proposedSolution: 1000,
    expectedImpact: 500,
    contact: 200,
    owner: 120,
    decision: 1000,
    rejectedReason: 120,
    duplicateOf: 60,
    implementedResult: 1000,
    managerComment: 1000
  }
};

export const CATEGORIES = [
  'Улучшение процесса',
  'Автоматизация',
  'Отчетность и аналитика',
  'Качество данных',
  'Клиентский сервис',
  'Снижение затрат',
  'Риски и контроль',
  'Другое'
];

export const FREQUENCIES = [
  'Каждый день',
  'Несколько раз в неделю',
  'Несколько раз в месяц',
  'Редко'
];

export const PUBLIC_STATUSES = [
  'New',
  'Under Review',
  'Accepted',
  'Planned',
  'Implemented'
];

export const ALL_STATUSES = [
  'New',
  'Under Review',
  'Accepted',
  'Planned',
  'Implemented',
  'Rejected'
];

export const BUSINESS_PRIORITIES = [
  '',
  'Low',
  'Medium',
  'High',
  'Critical'
];

export const REJECTED_REASONS = [
  '',
  'Дубликат',
  'Низкий эффект',
  'Не реализуемо',
  'Вне зоны ответственности',
  'Недостаточно данных',
  'Другое'
];

export const STATUS_LABELS = {
  New: 'Новая',
  'Under Review': 'На рассмотрении',
  Accepted: 'Одобрена',
  Planned: 'Запланирована',
  Implemented: 'Реализована',
  Rejected: 'Отклонена'
};
