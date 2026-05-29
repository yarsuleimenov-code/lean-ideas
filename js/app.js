import { callApi } from './api.js';
import { CATEGORIES, FREQUENCIES, CONFIG } from './config.js';

const form = document.querySelector('#initiativeForm');
const formPanel = document.querySelector('#formPanel');
const successPanel = document.querySelector('#successPanel');
const formError = document.querySelector('#formError');
const submitButton = document.querySelector('#submitButton');
const createdId = document.querySelector('#createdId');
const newIdeaButton = document.querySelector('#newIdeaButton');
const contactWrap = document.querySelector('#contactWrap');
const wantsContact = document.querySelector('#wantsContact');
const contact = document.querySelector('#contact');

function fillSelect(select, values, emptyLabel) {
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = emptyLabel;
  select.append(empty);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function trimLimited(value, limit) {
  return value.trim().slice(0, limit);
}

function showError(message) {
  formError.textContent = message;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}

function updateCounter(field) {
  const counter = document.querySelector(`[data-counter-for="${field.id}"]`);
  if (counter) {
    counter.textContent = String(field.value.length);
  }
}

function collectPayload() {
  return {
    category: form.category.value.trim(),
    currentSituation: trimLimited(form.currentSituation.value, CONFIG.TEXT_LIMITS.currentSituation),
    problem: trimLimited(form.problem.value, CONFIG.TEXT_LIMITS.problem),
    proposedSolution: trimLimited(form.proposedSolution.value, CONFIG.TEXT_LIMITS.proposedSolution),
    expectedImpact: trimLimited(form.expectedImpact.value, CONFIG.TEXT_LIMITS.expectedImpact),
    frequency: form.frequency.value.trim(),
    contact: wantsContact.checked ? trimLimited(contact.value, CONFIG.TEXT_LIMITS.contact) : ''
  };
}

function validatePayload(payload) {
  const requiredText = [
    ['Категория', payload.category],
    ['Текущая ситуация', payload.currentSituation],
    ['Проблема', payload.problem],
    ['Предлагаемое решение', payload.proposedSolution],
    ['Ожидаемый эффект', payload.expectedImpact],
    ['Частота возникновения', payload.frequency]
  ];

  const missing = requiredText.find(([, value]) => !value);
  if (missing) {
    return `Заполните поле: ${missing[0]}`;
  }

  if (wantsContact.checked && !payload.contact) {
    return 'Укажите контакт для связи или снимите чекбокс участия в обсуждении';
  }

  return '';
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Отправка...' : 'Отправить инициативу';
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError();

  const payload = collectPayload();
  const validationError = validatePayload(payload);

  if (validationError) {
    showError(validationError);
    return;
  }

  setLoading(true);

  try {
    const result = await callApi('submitInitiative', { data: payload });
    createdId.textContent = result.data.id;
    formPanel.classList.add('hidden');
    successPanel.classList.remove('hidden');
    form.reset();
    document.querySelectorAll('textarea').forEach(updateCounter);
    contactWrap.classList.add('hidden');
    contact.required = false;
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function resetFormView() {
  hideError();
  successPanel.classList.add('hidden');
  formPanel.classList.remove('hidden');
  createdId.textContent = '';
}

fillSelect(document.querySelector('#category'), CATEGORIES, 'Выберите категорию');
fillSelect(document.querySelector('#frequency'), FREQUENCIES, 'Выберите частоту');

document.querySelectorAll('textarea').forEach((field) => {
  updateCounter(field);
  field.addEventListener('input', () => updateCounter(field));
});

wantsContact.addEventListener('change', () => {
  contactWrap.classList.toggle('hidden', !wantsContact.checked);
  contact.required = wantsContact.checked;
  if (!wantsContact.checked) {
    contact.value = '';
  }
});

form.addEventListener('submit', handleSubmit);
newIdeaButton.addEventListener('click', resetFormView);
