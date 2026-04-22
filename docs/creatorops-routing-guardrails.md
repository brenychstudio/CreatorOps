# CreatorOps — Routing Guardrails (DO NOT BREAK)

## Single source of truth
- Routes живуть тільки в: `src/app/routes.tsx`
- `src/App.tsx` НЕ має містити `<Routes>`/`<Route>` (інакше легко зламати Shell/Outlet і отримати “порожній” прототип).

## Canonical files (roles)
- `src/main.tsx`
  - Обгортає App в `<BrowserRouter>` і підключає `src/style.css`.
- `src/App.tsx`
  - Тільки рендерить `AppRoutes` (тонкий wrapper).
- `src/app/routes.tsx`
  - Єдине місце, де визначені всі маршрути (marketing + prototype).
- `src/app/layout/PrototypeShell.tsx`
  - Реальний “Shell” прототипу (верхня навігація, Stepper, ReadoutRail, <Outlet />).
- `src/pages/prototype/PrototypeShell.tsx`
  - ТІЛЬКИ re-export на layout Shell (щоб routes імпортували зі `src/pages/...`, а логіка жила в `src/app/...`).

## Required code shapes (must match)

### `src/App.tsx` (thin wrapper)
```ts
import AppRoutes from "./app/routes";

export default function App() {
  return <AppRoutes />;
}
Symptoms & fixes
Symptom: /prototype відкривається, але UI “зникає” (білий екран + лише заголовок/кнопка)

Причина майже завжди одна з цих:

Маршрути були винесені в src/App.tsx і обійшли src/app/routes.tsx

/prototype рендерить не Shell (без Stepper/Readout/Outlet), а інший компонент (типу Index/Start screen)

Fix checklist:

Переконайся, що src/App.tsx = thin wrapper (без <Routes>).

Переконайся, що src/app/routes.tsx рендерить Prototype через:

import PrototypeShell from "../pages/prototype/PrototypeShell" (або відповідний шлях)

Переконайся, що src/pages/prototype/PrototypeShell.tsx = one-line re-export.

Operational rule

Перед будь-яким створенням/заміною файлу завжди вказуємо точний повний шлях (наприклад: src/app/routes.tsx).

## 2) Важливе уточнення по “1 рядок стосується тільки** `src/pages/prototype/PrototypeShell.tsx` (це має бути re-export).

## 3) Що НЕ робити (щоб не повторилося)
- Не вставляти `<Routes>` напряму в `src/App.tsx`.
- Не імпортувати Shell напряму з `src/app/layout/...` в різних місцях хаотично — тримати один канонічний шлях через `src/pages/prototype/PrototypeShell.tsx`.

# CreatorOps — Routing Guardrails

## Single source of truth
- Routes live only here: `src/app/routes.tsx`
- Do not duplicate routing in `src/App.tsx` or other files.

## App wrapper (no routes here)
- `src/app/App.tsx` must only render `<AppRoutes />`.

## Prototype shell ownership
- Real shell: `src/app/layout/PrototypeShell.tsx` (can be large)
- Re-export only: `src/pages/prototype/PrototypeShell.tsx`
  - Must be a 1-line re-export
  - No logic, no JSX inside

## Never route /prototype to PrototypeIndex directly
- `/prototype` must render `PrototypeShell`
- Prototype pages must be nested routes:
  - `/prototype/library`
  - `/prototype/smart-mix`
  - `/prototype/sequence`
  - `/prototype/planner`
  - `/prototype/captions`
  - `/prototype/export`
- Index route can redirect to `/prototype/library`

## Smoke tests
1) Open `/` (Marketing renders)
2) Open `/prototype/library` (full prototype UI renders: top tabs + readout rail)
3) Click each tab (Library/Smart Mix/Sequence/Planner/Captions/Export)
4) Open `/prototype` (must redirect to Library or render shell correctly)

## If UI disappears again
- First check `src/app/routes.tsx` and ensure `/prototype` uses `PrototypeShell` with nested routes.
- Confirm `src/pages/prototype/PrototypeShell.tsx` is only a re-export.
- If Vite acts weird: delete `node_modules/.vite` and run `npm run dev -- --force`.


