import { callApi } from './api.js';
import { CATEGORIES, PUBLIC_STATUSES, STATUS_LABELS } from './config.js';

const cards = document.querySelector('#cards');
const boardMessage = document.querySelector('#boardMessage');
const statusFilter = document.querySelector('#statusFilter');
const categoryFilter = document.querySelector('#categoryFilter');
const refreshButton = document.querySelector('#refreshButton');
const publicModal = document.querySelector('#publicModal');
const modalTitle = document.querySelector('#modalTitle');
const modalContent = document.querySelector('#modalContent');
const closeModalButton = document.querySelector('#closeModalButton');

let initiatives = [];

function fillSelect(select, values, allLabel) {
  select.replaceChildren();
  const all = document.createElement('option');
  all.value = '';
  all.textContent = allLabel;
  select.append(all);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = STATUS_LABELS[value] || value;
    select.append(option);
  });
}

function statusClass(status) {
  return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

function formatDate(value) {
  if (!value) return 'Не указана';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date);
}

function appendText(parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text || 'Не указано';
  parent.append(element);
  return element;
}

function addDetailBlock(title, text) {
  if (!text) return;

  const block = document.createElement('section');
  block.className = 'rounded-lg border border-slate-200 bg-slate-50 p-4';
  appendText(block, 'h3', 'text-sm font-black uppercase tracking-wide text-slate-500', title);
  appendText(block, 'p', 'mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800', text);
  modalContent.append(block);
}

function openDetails(id) {
  const item = initiatives.find((initiative) => initiative.ID === id);
  if (!item) return;

  modalTitle.textContent = item.ID;
  modalContent.replaceChildren();

  const meta = document.createElement('div');
  meta.className = 'flex flex-wrap items-center gap-2';
  const badge = document.createElement('span');
  badge.className = statusClass(item.Status);
  badge.textContent = STATUS_LABELS[item.Status] || item.Status;
  meta.append(badge);
  appendText(meta, 'span', 'text-sm font-bold text-slate-500', formatDate(item['Created At']));
  appendText(meta, 'span', 'text-sm font-black text-emerald-700', item.Category);
  modalContent.append(meta);

  addDetailBlock('Проблема', item.Problem);
  addDetailBlock('Предложенное решение', item['Proposed Solution']);
  addDetailBlock('Ожидаемый эффект', item['Expected Impact']);

  if (item.Status === 'Implemented') {
    addDetailBlock('Дата внедрения', formatDate(item['Implemented Date']));
    addDetailBlock('Что сделано', item['Implemented Result']);
    addDetailBlock('Комментарий менеджера', item['Manager Comment']);
  }

  publicModal.classList.remove('hidden');
}

function closeDetails() {
  publicModal.classList.add('hidden');
  modalTitle.textContent = '';
  modalContent.replaceChildren();
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'rounded-lg border border-slate-200 bg-white p-5 shadow-sm';

  const top = document.createElement('div');
  top.className = 'flex items-start justify-between gap-3';
  appendText(top, 'p', 'text-sm font-black text-slate-900', item.ID);
  const badge = document.createElement('span');
  badge.className = statusClass(item.Status);
  badge.textContent = STATUS_LABELS[item.Status] || item.Status;
  top.append(badge);
  article.append(top);

  appendText(article, 'p', 'mt-3 text-sm font-bold text-slate-500', formatDate(item['Created At']));
  appendText(article, 'p', 'mt-2 text-sm font-black text-emerald-700', item.Category);

  appendText(article, 'h2', 'mt-4 text-base font-black text-slate-950', 'Проблема');
  appendText(article, 'p', 'mt-2 line-clamp-3 text-sm leading-6 text-slate-700', item.Problem);

  appendText(article, 'h3', 'mt-4 text-base font-black text-slate-950', 'Решение');
  appendText(article, 'p', 'mt-2 line-clamp-3 text-sm leading-6 text-slate-700', item['Proposed Solution']);

  if (item.Status === 'Implemented' && item['Implemented Result']) {
    appendText(article, 'h3', 'mt-4 text-base font-black text-slate-950', 'Что сделано');
    appendText(article, 'p', 'mt-2 line-clamp-3 text-sm leading-6 text-slate-700', item['Implemented Result']);
  }

  const button = document.createElement('button');
  button.className = 'btn-secondary mt-5 w-full';
  button.type = 'button';
  button.textContent = 'Открыть карточку';
  button.addEventListener('click', () => openDetails(item.ID));
  article.append(button);

  return article;
}

function getFiltered() {
  return initiatives.filter((item) => {
    if (!PUBLIC_STATUSES.includes(item.Status)) return false;
    if (statusFilter.value && item.Status !== statusFilter.value) return false;
    if (categoryFilter.value && item.Category !== categoryFilter.value) return false;
    return true;
  });
}

function render() {
  cards.replaceChildren();
  boardMessage.classList.add('hidden');
  boardMessage.textContent = '';

  const filtered = getFiltered();
  if (!filtered.length) {
    boardMessage.textContent = 'По выбранным фильтрам инициативы не найдены.';
    boardMessage.classList.remove('hidden');
    return;
  }

  filtered.forEach((item) => cards.append(createCard(item)));
}

async function loadBoard() {
  refreshButton.disabled = true;
  refreshButton.textContent = 'Загрузка...';
  boardMessage.textContent = 'Загружаем инициативы...';
  boardMessage.classList.remove('hidden');
  cards.replaceChildren();

  try {
    const result = await callApi('getPublicBoard');
    initiatives = result.data.items || [];
    render();
  } catch (error) {
    boardMessage.textContent = error.message;
    boardMessage.classList.remove('hidden');
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Обновить';
  }
}

fillSelect(statusFilter, PUBLIC_STATUSES, 'Все статусы');
fillSelect(categoryFilter, CATEGORIES, 'Все категории');

statusFilter.addEventListener('change', render);
categoryFilter.addEventListener('change', render);
refreshButton.addEventListener('click', loadBoard);
closeModalButton.addEventListener('click', closeDetails);
publicModal.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-backdrop')) closeDetails();
});

loadBoard();
