import { CONFIG } from './config.js';

function assertConfigured() {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes('PASTE_')) {
    throw new Error('Не указан URL Google Apps Script Web App в js/config.js');
  }
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

export async function callApi(action, payload = {}) {
  assertConfigured();

  return callJsonp(action, payload);
}

function callJsonp(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `leanIdeasCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Превышено время ожидания ответа сервера'));
    }, CONFIG.REQUEST_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (result) => {
      cleanup();
      if (!result.ok) {
        reject(new Error(result.error || 'Запрос не выполнен'));
        return;
      }
      resolve(result);
    };

    const url = new URL(CONFIG.WEB_APP_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callbackName);
    url.searchParams.set('payload', JSON.stringify(payload));

    script.onerror = () => {
      cleanup();
      reject(new Error('Не удалось получить ответ Google Apps Script'));
    };

    script.src = url.toString();
    document.head.append(script);
  });
}

export async function callApiPost(action, payload = {}) {
  assertConfigured();

  const { controller, timer } = timeoutSignal(CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CONFIG.WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Запрос не выполнен');
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа сервера');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function getAdminToken() {
  return window.localStorage.getItem(CONFIG.ADMIN_TOKEN_STORAGE_KEY) || '';
}

export function setAdminToken(token) {
  window.localStorage.setItem(CONFIG.ADMIN_TOKEN_STORAGE_KEY, token.trim());
}

export function clearAdminToken() {
  window.localStorage.removeItem(CONFIG.ADMIN_TOKEN_STORAGE_KEY);
}
