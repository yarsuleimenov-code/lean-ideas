import { callApi, getAdminToken, setAdminToken, clearAdminToken } from './api.js';
import { ALL_STATUSES, BUSINESS_PRIORITIES, CATEGORIES, REJECTED_REASONS, STATUS_LABELS, CONFIG } from './config.js';

const kpiGrid = document.querySelector('#kpiGrid');
const tableBody = document.querySelector('#tableBody');
const adminMessage = document.querySelector('#adminMessage');
const searchFilter = document.querySelector('#searchFilter');
const categoryFilter = document.querySelector('#categoryFilter');
const statusFilter = document.querySelector('#statusFilter');
const priorityFilter = document.querySelector('#priorityFilter');
const dateFilter = document.querySelector('#dateFilter');
const tokenButton = document.querySelector('#tokenButton');
const refreshButton = document.querySelector('#refreshButton');
const exportButton = document.querySelector('#exportButton');
const modal = document.querySelector('#modal');
const modalTitle = document.querySelector('#modalTitle');
const closeModalButton = document.querySelector('#closeModalButton');
const detailReadOnly = document.querySelector('#detailReadOnly');
const detailForm = document.querySelector('#detailForm');
const modalError = document.querySelector('#modalError');
const saveButton = document.querySelector('#saveButton');

let initiatives = [];
let currentItem = null;

const kpiDefinitions = [
  ['Всего', null],
  ['Новые', 'New'],
  ['На рассмотрении', 'Under Review'],
  ['Одобрены', 'Accepted'],
  ['Запланированы', 'Planned'],
  ['Реализованы', 'Implemented'],
  ['Отклонены', 'Rejected']
];

const readOnlyFields = [
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

function fillSelect(select, values, allLabel) {
  select.replaceChildren();
  if (allLabel !== null) {
    const all = document.createElement('option');
    all.value = '';
    all.textContent = allLabel;
    select.append(all);
  }
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = STATUS_LABELS[value] || value || 'Не указано';
    select.append(option);
  });
}

function statusClass(status) {
  return `status-badge status-${String(status).toLowerCase().replace(/\s+/g, '-')}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date);
}

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function trimLimited(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function appendCell(row, text, className = 'px-4 py-3 align-top') {
  const cell = document.createElement('td');
  cell.className = className;
  cell.textContent = text || '';
  row.append(cell);
  return cell;
}

function showMessage(message) {
  adminMessage.textContent = message;
  adminMessage.classList.remove('hidden');
}

function hideMessage() {
  adminMessage.textContent = '';
  adminMessage.classList.add('hidden');
}

function showModalError(message) {
  modalError.textContent = message;
  modalError.classList.remove('hidden');
}

function hideModalError() {
  modalError.textContent = '';
  modalError.classList.add('hidden');
}

function isSlaRisk(item) {
  const created = new Date(item['Created At']);
  if (Number.isNaN(created.getTime())) return false;
  const ageDays = (Date.now() - created.getTime()) / 86400000;
  return (item.Status === 'New' && ageDays > 7) || (item.Status === 'Under Review' && ageDays > 14);
}

function renderKpi() {
  kpiGrid.replaceChildren();
  kpiDefinitions.forEach(([label, status]) => {
    const count = status ? initiatives.filter((item) => item.Status === status).length : initiatives.length;
    const card = document.createElement('article');
    card.className = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
    const labelNode = document.createElement('p');
    labelNode.className = 'text-xs font-black uppercase tracking-wide text-slate-500';
    labelNode.textContent = label;
    const valueNode = document.createElement('p');
    valueNode.className = 'mt-2 text-3xl font-black text-slate-950';
    valueNode.textContent = String(count);
    card.append(labelNode, valueNode);
    kpiGrid.append(card);
  });
}

function getFiltered() {
  const query = searchFilter.value.trim().toLowerCase();
  return initiatives.filter((item) => {
    const dateValue = dateInputValue(item['Created At']);
    const searchable = [
      item.ID,
      item.Category,
      item.Status,
      item.Problem,
      item['Proposed Solution'],
      item.Owner,
      item.Contact
    ].join(' ').toLowerCase();

    if (query && !searchable.includes(query)) return false;
    if (categoryFilter.value && item.Category !== categoryFilter.value) return false;
    if (statusFilter.value && item.Status !== statusFilter.value) return false;
    if (priorityFilter.value && item['Business Priority'] !== priorityFilter.value) return false;
    if (dateFilter.value && dateValue !== dateFilter.value) return false;
    return true;
  });
}

function renderTable() {
  tableBody.replaceChildren();
  const filtered = getFiltered();

  if (!filtered.length) {
    const row = document.createElement('tr');
    const cell = appendCell(row, 'По выбранным фильтрам инициативы не найдены.', 'px-4 py-5 text-center font-bold text-slate-600');
    cell.colSpan = 8;
    tableBody.append(row);
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement('tr');
    row.className = `cursor-pointer hover:bg-slate-50 ${isSlaRisk(item) ? 'sla-risk' : ''}`;
    row.tabIndex = 0;
    row.addEventListener('click', () => openModal(item.ID));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') openModal(item.ID);
    });

    appendCell(row, item.ID, 'px-4 py-3 align-top font-black text-slate-900');
    appendCell(row, formatDate(item['Created At']));
    appendCell(row, item.Category);

    const statusCell = document.createElement('td');
    statusCell.className = 'px-4 py-3 align-top';
    const badge = document.createElement('span');
    badge.className = statusClass(item.Status);
    badge.textContent = STATUS_LABELS[item.Status] || item.Status;
    statusCell.append(badge);
    row.append(statusCell);

    appendCell(row, String(item['Impact Score'] || ''));
    appendCell(row, item['Business Priority']);
    appendCell(row, item.Owner);
    appendCell(row, item.Contact ? 'Да' : 'Нет');
    tableBody.append(row);
  });
}

function renderAll() {
  hideMessage();
  renderKpi();
  renderTable();
}

function addReadOnlyField(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rounded-lg border border-slate-200 bg-slate-50 p-3';
  const title = document.createElement('p');
  title.className = 'text-xs font-black uppercase tracking-wide text-slate-500';
  title.textContent = label;
  const content = document.createElement('p');
  content.className = 'mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800';
  content.textContent = value || 'Не указано';
  wrapper.append(title, content);
  detailReadOnly.append(wrapper);
}

function setFormValues(item) {
  detailForm.elements.Status.value = item.Status || 'New';
  detailForm.elements['Business Priority'].value = item['Business Priority'] || '';
  detailForm.elements.Owner.value = item.Owner || '';
  detailForm.elements['Review Date'].value = dateInputValue(item['Review Date']);
  detailForm.elements['Implemented Date'].value = dateInputValue(item['Implemented Date']);
  detailForm.elements.Decision.value = item.Decision || '';
  detailForm.elements['Duplicate Of'].value = item['Duplicate Of'] || '';
  detailForm.elements['Implemented Result'].value = item['Implemented Result'] || '';
  detailForm.elements['Manager Comment'].value = item['Manager Comment'] || '';
  detailForm.elements['Rejected Reason'].value = item['Rejected Reason'] || '';
}

function openModal(id) {
  currentItem = initiatives.find((item) => item.ID === id);
  if (!currentItem) return;

  hideModalError();
  modalTitle.textContent = currentItem.ID;
  detailReadOnly.replaceChildren();
  readOnlyFields.forEach((field) => addReadOnlyField(field, field.includes('Date') || field === 'Created At' ? formatDate(currentItem[field]) : currentItem[field]));
  setFormValues(currentItem);
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  currentItem = null;
}

function collectUpdate() {
  return {
    Status: detailForm.elements.Status.value,
    'Business Priority': detailForm.elements['Business Priority'].value,
    Owner: trimLimited(detailForm.elements.Owner.value, CONFIG.TEXT_LIMITS.owner),
    'Review Date': detailForm.elements['Review Date'].value,
    'Implemented Date': detailForm.elements['Implemented Date'].value,
    Decision: trimLimited(detailForm.elements.Decision.value, CONFIG.TEXT_LIMITS.decision),
    'Duplicate Of': trimLimited(detailForm.elements['Duplicate Of'].value, CONFIG.TEXT_LIMITS.duplicateOf),
    'Implemented Result': trimLimited(detailForm.elements['Implemented Result'].value, CONFIG.TEXT_LIMITS.implementedResult),
    'Manager Comment': trimLimited(detailForm.elements['Manager Comment'].value, CONFIG.TEXT_LIMITS.managerComment),
    'Rejected Reason': detailForm.elements['Rejected Reason'].value
  };
}

async function handleSave(event) {
  event.preventDefault();
  if (!currentItem) return;

  hideModalError();
  const updates = collectUpdate();
  if (updates.Status === 'Rejected' && !updates['Rejected Reason']) {
    showModalError('Для статуса Rejected необходимо указать Rejected Reason');
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Сохранение...';

  try {
    const result = await callApi('updateInitiative', {
      token: getAdminToken(),
      id: currentItem.ID,
      updates
    });
    const index = initiatives.findIndex((item) => item.ID === currentItem.ID);
    if (index >= 0) initiatives[index] = result.data.item;
    renderAll();
    closeModal();
  } catch (error) {
    showModalError(error.message);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Сохранить изменения';
  }
}

async function loadAdminData() {
  const token = getAdminToken() || window.prompt('Введите ADMIN_TOKEN') || '';
  if (!token.trim()) {
    showMessage('Для загрузки панели нужен ADMIN_TOKEN.');
    return;
  }
  setAdminToken(token);

  refreshButton.disabled = true;
  refreshButton.textContent = 'Загрузка...';
  showMessage('Загружаем данные...');

  try {
    const result = await callApi('getAdminData', { token });
    initiatives = result.data.items || [];
    renderAll();
  } catch (error) {
    showMessage(error.message);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Обновить';
  }
}

function csvEscape(value) {
  let text = String(value ?? '').trim();
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const headers = [
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
  const rows = [headers.map(csvEscape).join(',')];
  getFiltered().forEach((item) => rows.push(headers.map((header) => csvEscape(item[header])).join(',')));
  const blob = new Blob([`\ufeff${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lean-ideas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function editToken() {
  const current = getAdminToken();
  const token = window.prompt('Введите ADMIN_TOKEN', current);
  if (token === null) return;
  if (!token.trim()) {
    clearAdminToken();
    showMessage('ADMIN_TOKEN удален из браузера.');
    return;
  }
  setAdminToken(token);
  loadAdminData();
}

fillSelect(categoryFilter, CATEGORIES, 'Все категории');
fillSelect(statusFilter, ALL_STATUSES, 'Все статусы');
fillSelect(priorityFilter, BUSINESS_PRIORITIES.filter(Boolean), 'Все приоритеты');
fillSelect(detailForm.elements.Status, ALL_STATUSES, null);
fillSelect(detailForm.elements['Business Priority'], BUSINESS_PRIORITIES, null);
fillSelect(detailForm.elements['Rejected Reason'], REJECTED_REASONS, null);

[searchFilter, categoryFilter, statusFilter, priorityFilter, dateFilter].forEach((element) => {
  element.addEventListener('input', renderTable);
  element.addEventListener('change', renderTable);
});

refreshButton.addEventListener('click', loadAdminData);
exportButton.addEventListener('click', exportCsv);
tokenButton.addEventListener('click', editToken);
closeModalButton.addEventListener('click', closeModal);
detailForm.addEventListener('submit', handleSave);
modal.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-backdrop')) closeModal();
});

loadAdminData();
