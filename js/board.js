import { callApi } from './api.js';
import { CATEGORIES, PUBLIC_STATUSES, STATUS_LABELS } from './config.js';

const cards = document.querySelector('#cards');
const boardMessage = document.querySelector('#boardMessage');
const statusFilter = document.querySelector('#statusFilter');
const categoryFilter = document.querySelector('#categoryFilter');
const refreshButton = document.querySelector('#refreshButton');

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

loadBoard();
