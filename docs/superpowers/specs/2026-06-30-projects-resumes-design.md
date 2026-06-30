# Дизайн: Проекты и Конструктор резюме (Этап 3)

> Дата: 2026-06-30  
> Статус: Утверждён

## Контекст

Этапы 0–2 завершены: фундамент, авторизация, медиатека. Этап 3 вводит
слой «Проект» между сырыми медиафайлами и резюме, и строит конструктор резюме.

```
MediaAsset → Project (тематическая подборка + описание)
           → Resume  (выбирает проекты + конкретные медиа)
```

---

## Схема БД

```sql
-- Проект: тематическая подборка медиа
projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  title       text not null,
  description text,
  created_at  timestamptz default now()
)

-- Все медиа проекта (полная библиотека проекта)
project_items (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  asset_id   uuid not null references media_assets(id) on delete cascade,
  position   int  not null default 0,
  caption    text
)

-- Резюме
resumes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  title      text not null,
  about      text,
  created_at timestamptz default now()
)

-- Гибкие контакты резюме (label/value/type)
resume_contacts (
  id        uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  label     text not null,
  value     text not null,
  type      text not null default 'text', -- text | url | phone | email
  position  int  not null default 0
)

-- Медиа в резюме: конкретный выбор из проекта
-- project_id денормализован — нужен просмотрщику без дополнительных джойнов
resume_items (
  id         uuid primary key default gen_random_uuid(),
  resume_id  uuid not null references resumes(id) on delete cascade,
  project_id uuid not null references projects(id),
  asset_id   uuid not null references media_assets(id),
  position   int  not null default 0,
  caption    text
)
```

### RLS

Все таблицы: `owner_id = auth.uid()` через `projects.owner_id` (для дочерних
таблиц — через join или `select auth.uid()`).

### Индексы

```sql
create index on project_items(project_id);
create index on resume_contacts(resume_id);
create index on resume_items(resume_id);
create index on resume_items(project_id);
```

---

## Кабинет — маршруты

| Маршрут | Назначение |
|---|---|
| `/admin/projects` | Список проектов |
| `/admin/projects/[id]` | Редактор проекта |
| `/admin/resumes` | Список резюме |
| `/admin/resumes/[id]` | Редактор резюме |

---

## `/admin/projects` — Список проектов

- Карточки: название, дата, «N медиа».
- Кнопки на карточке: «Открыть», «Дублировать», «Удалить» (с подтверждением).
- Кнопка «Новый проект» → создаёт запись, редиректит в редактор.

---

## `/admin/projects/[id]` — Редактор проекта

**Секция 1 — Основное**
- Поле «Название» (inline-редактирование или форма с автосохранением).
- Textarea «Описание проекта» — текст, который увидит работодатель в детальном просмотре.

**Секция 2 — Медиа проекта**
- Сетка добавленных медиа с drag-and-drop сортировкой (dnd-kit/sortable).
- Поле «Подпись» у каждой карточки (опционально, редактируется inline).
- Кнопка «Добавить из медиатеки» → **модал**: сетка всей медиатеки,
  мультивыбор чекбоксами, уже добавленные — отмечены и затемнены,
  кнопка «Добавить N файлов».

---

## `/admin/resumes` — Список резюме

- Карточки: название, дата, «N работ».
- Кнопки: «Открыть», «Дублировать», «Удалить».
- Кнопка «Новое резюме».

---

## `/admin/resumes/[id]` — Редактор резюме

**Секция 1 — Основное**
- Название резюме.
- «Обо мне» (textarea).

**Секция 2 — Контакты**
- Список строк: Label / Value / Type (select: текст, ссылка, телефон, email).
- Добавить строку, удалить, перетащить (dnd-kit).
- Кнопка «Скопировать из резюме…» → выбор резюме из списка → поля
  текущего резюме перезаписываются (с подтверждением).

**Секция 3 — Работы**
- Сетка добавленных медиа с drag-and-drop сортировкой.
- Поле «Подпись» на каждой карточке (опционально).
- Бейдж проекта на каждой карточке.
- Кнопка «Добавить из проекта» → **модал**:
  - Шаг 1: список проектов (карточки с превью).
  - Шаг 2: выбор проекта → сетка его медиа с чекбоксами,
    уже добавленные в резюме — отмечены.
  - «Добавить N работ» → закрывает модал, обновляет список.

---

## Апгрейд медиакарточки (/admin/media)

На каждой карточке медиа (при наведении или постоянно) — два бейджа:
- «Проектов: N»
- «В резюме: N»

Клик на бейдж → **Sheet** (shadcn, справа на десктопе / снизу на мобилке):
- Список проектов/резюме со ссылками «Открыть».

Реализуется через расширение `listAssets()`: добавить counts через
`project_items` и `resume_items`.

---

## Публичный просмотр (Этап 4 — за рамками этого дизайна)

Зафиксировано как требование для учёта при проектировании БД:

**`/r/[slug]`** — плоская сетка всех `resume_items` (медиа из всех проектов резюме).

**`/r/[slug]/[itemId]`** — детальный просмотр:
- Верх: медиа (фото / видео-плеер).
- Середина: `projects.title` + `projects.description`.
- Низ: остальные `resume_items` с тем же `project_id` в этом резюме
  (только отобранные художницей, не весь проект).

---

## Технические решения

| Вопрос | Решение |
|---|---|
| Drag-and-drop | `@dnd-kit/sortable` — уже подходит для Next.js App Router |
| Модал медиапикера | shadcn `Dialog` |
| Шторка (Sheet) | shadcn `Sheet` |
| Автосохранение vs кнопка | Кнопка «Сохранить» — проще, нет риска потери при навигации |
| Дублирование резюме | Server action: копирует `resumes` + `resume_contacts` + `resume_items` |

---

## Не входит в Этап 3

- Публичная страница `/r/[slug]` (Этап 4).
- Защита медиа, водяные знаки (Этап 5).
- Аналитика просмотров.
