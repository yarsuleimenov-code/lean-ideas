# Lean Ideas Zaberman

Pilot-ready MVP система управления инициативами по улучшению процессов для внутреннего использования в компании Zaberman.

## 1. Назначение системы

Система помогает сотрудникам фиксировать проблемы процессов и предлагать улучшения, а ответственным менеджерам — рассматривать инициативы, назначать владельцев, контролировать сроки, вести статусы и формировать базу знаний по реализованным улучшениям.

Основные сценарии:

- подача инициативы через публичную форму;
- просмотр публичной доски без персональных и управленческих данных;
- администрирование инициатив через защищенную временным `ADMIN_TOKEN` панель;
- расчет `Impact Score` по частоте возникновения проблемы;
- Telegram-уведомление ответственному чату о новой инициативе;
- экспорт текущей выборки в CSV с защитой от CSV Injection.

## 2. Архитектура решения

Пользователь открывает локальный HTML-файл или Live Server. Frontend отправляет запросы в Google Apps Script Web App. Apps Script записывает и читает данные из Google Sheets. После создания инициативы Apps Script отправляет уведомление через Telegram Bot API.

Схема:

```text
Пользователь
↓
index.html / board.html / admin.html
↓
Google Apps Script Web App
↓
Google Sheets
↓
Telegram уведомление
↓
Ответственный сотрудник
```

## 3. Настройка Google Sheets

1. Создайте новую Google Таблицу.
2. Назовите файл, например `Lean Ideas Zaberman`.
3. Создайте лист с названием `Lean Ideas`.
4. Скопируйте ID таблицы из URL. В ссылке вида `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` нужен фрагмент `SPREADSHEET_ID`.

Apps Script умеет создать лист и заголовки автоматически, но для прозрачности пилота рекомендуется создать лист заранее.

## 4. Создание структуры листа

В первой строке листа `Lean Ideas` должны быть колонки:

```text
ID
Created At
Category
Current Situation
Problem
Proposed Solution
Expected Impact
Frequency
Contact
Status
Impact Score
Business Priority
Owner
Review Date
Implemented Date
Decision
Rejected Reason
Duplicate Of
Implemented Result
Manager Comment
Source
```

Если первая строка пустая, `google-apps-script.gs` заполнит заголовки автоматически при первом запросе.

## 5. Настройка Google Apps Script

1. Откройте Google Таблицу.
2. Выберите `Расширения` → `Apps Script`.
3. Удалите содержимое стандартного файла.
4. Скопируйте весь код из `google-apps-script.gs`.
5. Сохраните проект.

Если Apps Script создан не из таблицы, добавьте `SPREADSHEET_ID` в Script Properties, как описано ниже.

## 6. Настройка Telegram Bot

1. Откройте Telegram и найдите `@BotFather`.
2. Создайте бота командой `/newbot`.
3. Сохраните полученный `BOT_TOKEN`.
4. Добавьте бота в нужный чат или канал.
5. Получите `CHAT_ID`. Для группы обычно удобно отправить сообщение в группу и открыть:

```text
https://api.telegram.org/botBOT_TOKEN/getUpdates
```

В ответе найдите `chat.id`.

## 7. Настройка Script Properties

В Apps Script откройте `Project Settings` → `Script Properties` и добавьте:

| Key | Value |
| --- | --- |
| `ADMIN_TOKEN` | временный секрет для входа в админ-панель |
| `BOT_TOKEN` | токен Telegram-бота |
| `CHAT_ID` | ID Telegram-чата |
| `SPREADSHEET_ID` | ID Google Таблицы, если скрипт не bound script |

`BOT_TOKEN` и `CHAT_ID` не хранятся во frontend.

## 8. Деплой Web App

1. В Apps Script нажмите `Deploy` → `New deployment`.
2. Выберите тип `Web app`.
3. В поле `Execute as` выберите `Me`.
4. В поле `Who has access` выберите вариант, доступный для пилота. Часто для MVP используют `Anyone with the link`.
5. Нажмите `Deploy`.
6. Скопируйте `Web app URL`.

После изменения Apps Script создавайте новый deployment или обновляйте существующий, иначе frontend будет обращаться к старой версии.

## 9. Настройка config.js

Откройте `js/config.js` и укажите URL Web App:

```js
export const CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/ВАШ_DEPLOYMENT_ID/exec',
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
```

Не размещайте `ADMIN_TOKEN`, `BOT_TOKEN` или `CHAT_ID` в frontend-коде.

## 10. Локальный запуск

Рекомендуемый вариант: использовать Live Server в редакторе кода или любой локальный статический HTTP-сервер.

- `index.html` — публичная форма подачи инициативы.
- `board.html` — публичная доска.
- `admin.html` — панель администратора.

Из-за ES6 Modules прямое открытие через `file://` может блокироваться политиками браузера. Если браузер не загружает `js/*.js`, запустите проект через Live Server.

Структура проекта:

```text
lean-ideas/
├── index.html
├── board.html
├── admin.html
├── google-apps-script.gs
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── config.js
    ├── api.js
    ├── app.js
    ├── board.js
    └── admin.js
```

## 11. Ограничения Pilot MVP

Это pilot-ready MVP, а не production-grade система безопасности.

Текущие ограничения:

- полноценная авторизация отсутствует;
- `ADMIN_TOKEN` является временным барьером, а не полноценной защитой;
- при наличии `ADMIN_TOKEN` пользователь может получить административные данные;
- токен администратора хранится в `localStorage` браузера;
- права доступа к Web App зависят от настроек Google Apps Script deployment;
- нет разграничения ролей по подразделениям и владельцам;
- нет аудита изменений по каждому полю;
- нет защиты от всех корпоративных сценариев утечки данных;
- Google Apps Script имеет лимиты выполнения и квоты Google.

Для production потребуется полноценная авторизация сотрудников, управление ролями, журналирование, безопасная серверная прослойка и согласованная модель доступа.

## 12. План перехода на Production

Рекомендуемый путь развития:

- внедрить корпоративную авторизацию через Google Workspace, SSO или отдельный backend;
- заменить `ADMIN_TOKEN` на роли и права доступа;
- добавить журнал изменений инициатив;
- добавить историю комментариев и обсуждений;
- настроить SLA-уведомления по просроченным инициативам;
- вынести Telegram-интеграцию в управляемый backend-сервис;
- добавить rate limiting и защиту от массовой отправки форм;
- настроить резервное копирование данных;
- добавить тестирование бизнес-логики;
- подготовить регламент обработки инициатив;
- определить владельцев процесса и правила изменения статусов.

## Будущее развитие

Возможные улучшения после пилота:

- голосование за инициативы;
- Telegram Digest;
- расчет экономического эффекта;
- метрики реализации;
- интеграция с Kaiten;
- интеграция с Jira;
- полноценная авторизация сотрудников;
- база знаний реализованных инициатив.

## Статусы инициатив

| Status | Значение |
| --- | --- |
| `New` | новая инициатива |
| `Under Review` | рассматривается |
| `Accepted` | одобрена |
| `Planned` | назначен ответственный и запланирована реализация |
| `Implemented` | реализована |
| `Rejected` | отклонена |

## Impact Score

`Impact Score` рассчитывается на стороне Apps Script:

| Частота | Score |
| --- | --- |
| Каждый день | 4 |
| Несколько раз в неделю | 3 |
| Несколько раз в месяц | 2 |
| Редко | 1 |

## Администрирование

В `admin.html` доступны:

- KPI по статусам;
- фильтры по поиску, категории, статусу, приоритету и дате;
- SLA-подсветка: `New` старше 7 дней и `Under Review` старше 14 дней;
- детальная карточка инициативы;
- редактирование разрешенных управленческих полей;
- CSV-экспорт текущего отфильтрованного набора данных.

CSV-экспорт защищает от CSV Injection: если значение начинается с `=`, `+`, `-` или `@`, перед ним добавляется `'`.
