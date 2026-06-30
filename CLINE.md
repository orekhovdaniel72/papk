# Cline Rules — yuzotova-art

## 1. Актуальность документации (обязательно!)
Мои обучающие данные: ~2025. Текущая дата: 2026+.
**Прежде чем писать код**, я обязан:
1. Для **Next.js** — читать локальные доки из `node_modules/next/dist/docs/`
2. Для **shadcn/ui, Supabase, Tailwind v4** и др. зависимостей — `resolve-library-id` + `query-docs` через Context7 MCP
3. Если Context7 не дал ответа — `fetch_readable` для загрузки документации с сайта
4. Не полагаться на свою память об API, если есть сомнения

## 2. Проект
Resume + portfolio сервис для 3D-художника.
- Одна приватная медиатека → много независимых резюме
- Каждое шарится по изолированной ссылке (опционально пароль + expiry)
- Медиа никогда не публично: только short-lived signed URLs после проверки токена

## 3. Стек
| Компонент | Технология |
|-----------|------------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | Tailwind v4 + shadcn/ui (nova preset, Lucide icons, Geist font) |
| DB / Auth | Supabase (Postgres + Auth) — owner-only |
| Storage | Cloudflare R2 — signed URLs |
| Hosting | Vercel |

## 4. Команды
```bash
npm run dev      # Dev-сервер (Turbopack)
npm run build    # Production-сборка
npm run lint     # Линтер
npx shadcn@latest add <name> --yes   # Добавить shadcn/ui компонент
```

## 5. Конвенции
- `src/app/` — App Router роуты
- `src/components/` — UI компоненты
- `src/lib/` — клиенты и утилиты
- Секреты только в `.env.local` (gitignored). `.env.local.example` держать в актуальном состоянии
- Маленькие верифицируемые коммиты — одна фича на коммит