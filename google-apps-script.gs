const SHEET_NAME = 'Lean Ideas';

const HEADERS = [
  'ID',
  'Created At',
  'Category',
  'Current Situation',
  'Problem',
  'Proposed Solution',
  'Expected Impact',
  'Frequency',
  'Contact',
  'Status',
  'Impact Score',
  'Business Priority',
  'Owner',
  'Review Date',
  'Implemented Date',
  'Decision',
  'Rejected Reason',
  'Duplicate Of',
  'Implemented Result',
  'Manager Comment',
  'Source'
];

const PUBLIC_HEADERS = [
  'ID',
  'Created At',
  'Category',
  'Status',
  'Problem',
  'Proposed Solution'
];

const UPDATE_HEADERS = [
  'Status',
  'Business Priority',
  'Owner',
  'Review Date',
  'Implemented Date',
  'Decision',
  'Rejected Reason',
  'Duplicate Of',
  'Implemented Result',
  'Manager Comment'
];

const CATEGORIES = [
  'Улучшение процесса',
  'Автоматизация',
  'Отчетность и аналитика',
  'Качество данных',
  'Клиентский сервис',
  'Снижение затрат',
  'Риски и контроль',
  'Другое'
];

const FREQUENCY_SCORE = {
  'Каждый день': 4,
  'Несколько раз в неделю': 3,
  'Несколько раз в месяц': 2,
  'Редко': 1
};

const STATUSES = [
  'New',
  'Under Review',
  'Accepted',
  'Planned',
  'Implemented',
  'Rejected'
];

const BUSINESS_PRIORITIES = [
  '',
  'Low',
  'Medium',
  'High',
  'Critical'
];

const REJECTED_REASONS = [
  '',
  'Дубликат',
  'Низкий эффект',
  'Не реализуемо',
  'Вне зоны ответственности',
  'Недостаточно данных',
  'Другое'
];

const TEXT_LIMITS = {
  category: 80,
  currentSituation: 1000,
  problem: 1000,
  proposedSolution: 1000,
  expectedImpact: 500,
  frequency: 80,
  contact: 200,
  owner: 120,
  decision: 1000,
  rejectedReason: 120,
  duplicateOf: 60,
  implementedResult: 1000,
  managerComment: 1000
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = sanitizeText_(params.action, 80);
  const callback = sanitizeText_(params.callback, 80);

  try {
    const result = route_(action, params);
    return output_(result, callback);
  } catch (error) {
    return output_({ ok: false, error: error.message }, callback);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const result = route_(body.action, body);
    return output_(result);
  } catch (error) {
    return output_({ ok: false, error: error.message });
  }
}

function route_(action, payload) {
  if (action === 'submitInitiative') {
    return submitInitiative_(payload.data || payload);
  }
  if (action === 'getPublicBoard') {
    return getPublicBoard_();
  }
  if (action === 'getAdminData') {
    assertAdmin_(payload.token);
    return getAdminData_();
  }
  if (action === 'updateInitiative') {
    assertAdmin_(payload.token);
    return updateInitiative_(payload.id, payload.updates || {});
  }
  throw new Error('Неизвестное действие');
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  const contents = e.postData.contents;
  const type = e.postData.type || '';

  if (type.indexOf('application/json') >= 0 || contents.charAt(0) === '{') {
    return JSON.parse(contents);
  }

  return contents.split('&').reduce(function(result, pair) {
    const parts = pair.split('=');
    if (parts[0]) {
      result[decodeURIComponent(parts[0])] = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
    }
    return result;
  }, {});
}

function output_(payload, callback) {
  if (callback) {
    const safeCallback = callback.replace(/[^\w.$]/g, '');
    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Укажите SPREADSHEET_ID в Script Properties или используйте bound Apps Script внутри Google Sheet');
  }
  return active;
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const values = range.getValues()[0];
  const isEmpty = values.every(function(value) { return !value; });

  if (isEmpty) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const missing = HEADERS.some(function(header, index) {
    return values[index] !== header;
  });

  if (missing) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function submitInitiative_(data) {
  const item = normalizeSubmission_(data || {});
  const sheet = getSheet_();
  const id = generateId_();
  const now = new Date();

  const rowObject = {
    'ID': id,
    'Created At': now,
    'Category': item.category,
    'Current Situation': item.currentSituation,
    'Problem': item.problem,
    'Proposed Solution': item.proposedSolution,
    'Expected Impact': item.expectedImpact,
    'Frequency': item.frequency,
    'Contact': item.contact,
    'Status': 'New',
    'Impact Score': FREQUENCY_SCORE[item.frequency],
    'Business Priority': '',
    'Owner': '',
    'Review Date': '',
    'Implemented Date': '',
    'Decision': '',
    'Rejected Reason': '',
    'Duplicate Of': '',
    'Implemented Result': '',
    'Manager Comment': '',
    'Source': 'Manual Form'
  };

  sheet.appendRow(HEADERS.map(function(header) {
    return rowObject[header];
  }));

  sendTelegramNotification_(rowObject);

  return {
    ok: true,
    data: {
      id: id
    }
  };
}

function getPublicBoard_() {
  const rows = getRows_();
  const items = rows
    .filter(function(item) {
      return item.Status !== 'Rejected';
    })
    .map(function(item) {
      return pick_(item, PUBLIC_HEADERS);
    });

  return {
    ok: true,
    data: {
      items: items
    }
  };
}

function getAdminData_() {
  return {
    ok: true,
    data: {
      items: getRows_()
    }
  };
}

function updateInitiative_(id, updates) {
  const cleanId = sanitizeText_(id, 60);
  if (!cleanId) {
    throw new Error('Не указан ID инициативы');
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const headerIndex = headerIndex_();
  let rowNumber = -1;

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][headerIndex.ID]).trim() === cleanId) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber < 0) {
    throw new Error('Инициатива не найдена');
  }

  const normalized = normalizeUpdates_(updates || {});

  UPDATE_HEADERS.forEach(function(header) {
    if (Object.prototype.hasOwnProperty.call(normalized, header)) {
      sheet.getRange(rowNumber, headerIndex[header] + 1).setValue(normalized[header]);
    }
  });

  const item = rowToObject_(sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0]);

  return {
    ok: true,
    data: {
      item: item
    }
  };
}

function normalizeSubmission_(data) {
  const item = {
    category: sanitizeText_(data.category, TEXT_LIMITS.category),
    currentSituation: sanitizeText_(data.currentSituation, TEXT_LIMITS.currentSituation),
    problem: sanitizeText_(data.problem, TEXT_LIMITS.problem),
    proposedSolution: sanitizeText_(data.proposedSolution, TEXT_LIMITS.proposedSolution),
    expectedImpact: sanitizeText_(data.expectedImpact, TEXT_LIMITS.expectedImpact),
    frequency: sanitizeText_(data.frequency, TEXT_LIMITS.frequency),
    contact: sanitizeText_(data.contact, TEXT_LIMITS.contact)
  };

  requireValue_(item.category, 'Категория');
  requireValue_(item.currentSituation, 'Текущая ситуация');
  requireValue_(item.problem, 'Проблема');
  requireValue_(item.proposedSolution, 'Предлагаемое решение');
  requireValue_(item.expectedImpact, 'Ожидаемый эффект');
  requireValue_(item.frequency, 'Частота возникновения');

  if (CATEGORIES.indexOf(item.category) < 0) {
    throw new Error('Некорректная категория');
  }

  if (!FREQUENCY_SCORE[item.frequency]) {
    throw new Error('Некорректная частота возникновения');
  }

  return item;
}

function normalizeUpdates_(updates) {
  const normalized = {};

  UPDATE_HEADERS.forEach(function(header) {
    if (Object.prototype.hasOwnProperty.call(updates, header)) {
      normalized[header] = sanitizeUpdateValue_(header, updates[header]);
    }
  });

  if (normalized.Status && STATUSES.indexOf(normalized.Status) < 0) {
    throw new Error('Некорректный статус');
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'Business Priority') && BUSINESS_PRIORITIES.indexOf(normalized['Business Priority']) < 0) {
    throw new Error('Некорректный Business Priority');
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'Rejected Reason') && REJECTED_REASONS.indexOf(normalized['Rejected Reason']) < 0) {
    throw new Error('Некорректный Rejected Reason');
  }

  if (normalized.Status === 'Rejected' && !normalized['Rejected Reason']) {
    throw new Error('Для Rejected необходимо указать Rejected Reason');
  }

  return normalized;
}

function sanitizeUpdateValue_(header, value) {
  const limits = {
    'Owner': TEXT_LIMITS.owner,
    'Decision': TEXT_LIMITS.decision,
    'Rejected Reason': TEXT_LIMITS.rejectedReason,
    'Duplicate Of': TEXT_LIMITS.duplicateOf,
    'Implemented Result': TEXT_LIMITS.implementedResult,
    'Manager Comment': TEXT_LIMITS.managerComment
  };

  if (header === 'Review Date' || header === 'Implemented Date') {
    return normalizeDate_(value);
  }

  return sanitizeText_(value, limits[header] || 120);
}

function normalizeDate_(value) {
  const text = sanitizeText_(value, 30);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Некорректная дата');
  }
  return date;
}

function sanitizeText_(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function requireValue_(value, label) {
  if (!value) {
    throw new Error('Заполните поле: ' + label);
  }
}

function headerIndex_() {
  return HEADERS.reduce(function(result, header, index) {
    result[header] = index;
    return result;
  }, {});
}

function getRows_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .filter(function(row) {
      return row.some(function(value) { return value !== ''; });
    })
    .map(rowToObject_);
}

function rowToObject_(row) {
  return HEADERS.reduce(function(result, header, index) {
    const value = row[index];
    result[header] = value instanceof Date ? value.toISOString() : value;
    return result;
  }, {});
}

function pick_(item, headers) {
  return headers.reduce(function(result, header) {
    result[header] = item[header];
    return result;
  }, {});
}

function generateId_() {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return 'LI-' + timestamp + '-' + random;
}

function assertAdmin_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!expected) {
    throw new Error('ADMIN_TOKEN не настроен в Script Properties');
  }
  if (sanitizeText_(token, 200) !== expected) {
    throw new Error('Неверный ADMIN_TOKEN');
  }
}

function sendTelegramNotification_(item) {
  const properties = PropertiesService.getScriptProperties();
  const botToken = properties.getProperty('BOT_TOKEN');
  const chatId = properties.getProperty('CHAT_ID');

  if (!botToken || !chatId) {
    return;
  }

  const problem = String(item.Problem || '').slice(0, 500);
  const text = [
    'Новая инициатива',
    '',
    'ID: ' + item.ID,
    'Категория: ' + item.Category,
    'Частота: ' + item.Frequency,
    'Контакт указан: ' + (item.Contact ? 'Да' : 'Нет'),
    '',
    'Краткое описание проблемы:',
    problem
  ].join('\n');

  const url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text,
    disable_web_page_preview: true
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    console.warn('Ошибка отправки Telegram: ' + error.message);
  }
}
