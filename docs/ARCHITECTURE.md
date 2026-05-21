# Architecture

## Overview

Game Sheets is a **Nuxt 4** Progressive Web App for tracking board and card game scores. It is fully client-side for game state (localStorage) with a thin Nitro WebSocket server for optional real-time multiplayer.

```
Browser
  └── Nuxt app (SSR → hydrates on client)
        ├── Pages          (app/pages/)
        ├── Components     (app/components/, components/)
        ├── Composables    (app/composables/)
        └── Assets / i18n  (assets/, locales/)

Nitro server
  └── WebSocket API        (server/api/game-mp.ts)
```

---

## Tech Stack

| Concern | Library / Version |
|---|---|
| Framework | Nuxt 4 (`nuxt ^4.4.2`) |
| UI components | `@nuxt/ui ^4.7.1` (Tailwind CSS v4) |
| Styling | Tailwind CSS v4 via `~/assets/css/main.css` |
| Icons | Lucide + Simple Icons (`@iconify-json/*`) |
| i18n | `@nuxtjs/i18n ^10.3.0` |
| PWA | `@vite-pwa/nuxt ^1.1.1` (Workbox) |
| Images | `@nuxt/image 2.0.0` |
| Testing – unit/integration | Vitest v4 + `@nuxt/test-utils` + happy-dom |
| Testing – e2e | Playwright |
| Linting | ESLint v10 (`@nuxt/eslint`) |
| Type checking | vue-tsc + TypeScript 6 |

**Color theme** (`app/app.config.ts`): `primary = green`, `neutral = slate`.

---

## Directory Layout

```
games/
├── app/
│   ├── app.vue              # Root shell (header, nav, footer, PWA prompt)
│   ├── app.config.ts        # Nuxt UI color tokens
│   ├── assets/css/main.css  # Tailwind CSS entry
│   ├── components/          # Reusable Vue components
│   ├── composables/         # Game logic + state management
│   └── pages/               # File-based routing
│       ├── index.vue         # Home – game selection grid
│       ├── sudoku.vue        # Sudoku puzzle
│       ├── credits.vue       # Credits & licenses
│       └── sheets/
│           ├── index.vue     # Sheets hub
│           ├── kniffel.vue   # Kniffel score sheet
│           ├── notizblock.vue# Free-form notepad
│           └── phase10.vue   # Phase 10 tracker
├── components/
│   └── PwaUpdatePrompt.vue  # PWA update banner (outside app/ so Nuxt picks it up globally)
├── locales/
│   ├── en.json
│   └── de.json
├── server/
│   └── api/
│       └── game-mp.ts       # Nitro WebSocket multiplayer handler
├── public/                  # Static assets, icons, manifest
├── tests/                   # All tests
│   ├── unit/                # Vitest unit tests
│   ├── nuxt/                # Vitest Nuxt integration tests
│   └── e2e/                 # Playwright e2e tests
├── types/
│   └── pwa.d.ts             # PWA type augmentations
├── nuxt.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── eslint.config.mjs
```

---

## Routing

Nuxt file-based routing. All routes are unlocalized (i18n strategy: `no_prefix`).

| URL | Page | Description |
|---|---|---|
| `/` | `pages/index.vue` | Game selection grid |
| `/sudoku` | `pages/sudoku.vue` | Sudoku puzzle generator |
| `/sheets` | `pages/sheets/index.vue` | Score sheets hub |
| `/sheets/kniffel` | `pages/sheets/kniffel.vue` | Kniffel tracker |
| `/sheets/phase10` | `pages/sheets/phase10.vue` | Phase 10 tracker |
| `/sheets/notizblock` | `pages/sheets/notizblock.vue` | Freeform notepad |
| `/credits` | `pages/credits.vue` | Credits & licenses |

---

## App Shell (`app/app.vue`)

The root layout wraps every page. Key responsibilities:

- `UHeader` with `AppLogo` → home link, EN/DE locale switcher, dark mode toggle.
- **Game history sidebar** – shown only on `/sheets/kniffel` and `/sheets/phase10` routes. Reads `useGameHistory` to render a grouped history panel with avg score and win/loss badges. A "clear all" action deletes the stored history for that game.
- `UMain` for page slot.
- `UFooter` with copyright and credits link.
- `<PwaUpdatePrompt client-only />` – renders the update banner.
- Locale-aware `useHead()` meta (viewport, theme-color, canonical, manifest link, apple-touch-icon).

---

## Composables

All game composables follow the same pattern:

1. Declare `ref`s for reactive state.
2. `load()` – call once on component mount; reads from `useGameStorage`.
3. `save()` – called internally after every mutation.
4. Expose computed helpers and mutation functions.

### `useGameStorage`

Thin wrappers around `localStorage`:

```ts
loadFromStorage<T>(key: string): T | null
saveToStorage<T>(key: string, data: T): void
```

Both no-op server-side (`import.meta.client` guard).

### `useGameHistory`

Module-level reactive singletons (`phase10History`, `kniffelHistory`) so updates propagate across components without a provide/inject.

- Max 20 entries per game (FIFO).
- Storage keys: `phase10-history`, `kniffel-history`.

### `usePhase10`

Tracks completed phases (by id) and a running list of penalty scores.

Key types: `PhaseSetKey = 'classic' | 'alt'`

State shape (`localStorage` key: `phase10-game`):
```ts
{ completedPhases: number[], scores: number[], phaseSetKey: PhaseSetKey | null }
```

### `usePhase10Multiplayer`

Extends `usePhase10` with WebSocket sync via `useMultiplayer<Phase10State>`.

### `useKniffel`

Tracks variant selection and per-category scores.

Key types: `KniffelVariant = 'standard' | 'extrem'`

- **Standard** – 13 categories, 5 dice.
- **Extrem** – 16 categories, 6 dice.

Scoring: most categories store sum-of-dice; some have fixed values (e.g. Kniffel = 50, Kniffel Extrem = 75). Upper section bonus: +35 if total ≥ 63 (standard) / +50 if total ≥ 72 (extrem).

State shape (`localStorage` key: `kniffel-game`):
```ts
{ variant: KniffelVariant | null, categories: Record<string, number | null> }
```

### `useKniffelMultiplayer`

Extends `useKniffel` with WebSocket sync via `useMultiplayer<KniffelState>`.

### `useNotepad`

Manages a list of named players, each with an array of point entries.

State shape (`localStorage` key: `notepad-game`):
```ts
{ players: Array<{ id: string, name: string, entries: Array<{ id: string, points: number }> }> }
```

IDs use `crypto.randomUUID()` with a fallback.

### `useMultiplayer<TState>`

Generic WebSocket client for any game. Handles:

- Room creation/joining (6-char alphanumeric room codes).
- 16-char random player IDs (no auth).
- Broadcasting own state; receiving full player list from server.
- Graceful `leave` message on disconnect/unmount.

Connect call: `connect(roomCode, playerName)` → opens `ws://[host]/api/game-mp`.

### `useSudoku`

Pure client-side Sudoku engine (no storage).

Two-phase generation:
1. Fill the three diagonal 3×3 boxes with shuffled digits (no inter-box conflicts).
2. Backtracking solver fills remaining 54 cells.
3. Carve clues: remove cells in random order, verify unique solution after each removal (stop at target clue count per difficulty).

Difficulties and target clue counts:

| Difficulty | Clues |
|---|---|
| easy | ~36 |
| medium | ~30 |
| hard | ~25 |

Exported types: `Grid = (number | null)[][]`, `Difficulty = 'easy' | 'medium' | 'hard'`

---

## Multiplayer Server (`server/api/game-mp.ts`)

A **Nitro WebSocket** handler (crossws `Peer`). Fully in-memory – no persistence, no auth.

### Message Protocol

All messages are JSON. Client → Server:

| `type` | Fields | Description |
|---|---|---|
| `join` | `game`, `room`, `playerId`, `name` | Join/create a room |
| `state` | `game`, `room`, `playerId`, `state` | Push own game state |
| `leave` | `game`, `room`, `playerId` | Gracefully leave |

Server → Client (broadcast to whole room):

| `type` | Fields | Description |
|---|---|---|
| `players` | `players[]` | Full player list with states |

### Validation / Limits

| Constraint | Value |
|---|---|
| Max room size | 10 players |
| Room code format | `/^[A-Z0-9]{4,10}$/` |
| Player ID format | `/^[a-z0-9]{8,20}$/` |
| Max player name | 30 chars |
| Max state JSON | 4 096 bytes |
| Supported games | `phase10`, `kniffel`, `notepad` |

Rooms are garbage-collected when the last player leaves.

---

## i18n

- Strategy: `no_prefix` (no URL prefix for any locale).
- Default locale: `en` (en-US).
- Supported: `en` (English), `de` (Deutsch).
- Detection: cookie (`i18n_redirected`), fallback to browser language.
- Lang files: `locales/en.json`, `locales/de.json`.

### Translation key namespaces

| Prefix | Scope |
|---|---|
| `app.*` | Global title, subtitle, credits |
| `pwa.*` | PWA update prompts |
| `history.*` | Game history panel |
| `games.*` | Game card descriptions and tags |
| `phase10.*` | Phase 10 UI strings |
| `kniffel.*` | Kniffel UI strings |
| `notepad.*` | Notepad UI strings |
| `credits.*` | Credits page content |

---

## PWA & Caching

Configured via `@vite-pwa/nuxt` with Workbox.

| Cache | Strategy | TTL | Pattern |
|---|---|---|---|
| `pages-cache` | NetworkFirst (3 s timeout) | 7 days | App routes (`/`, `/kniffel`, `/phase10`, …) |
| `nuxt-assets-cache` | StaleWhileRevalidate | 30 days | `/_nuxt/*.{js,mjs,css}` |
| `google-fonts-cache` | CacheFirst | 1 year | `fonts.googleapis.com` |

- `registerType: 'autoUpdate'` – SW silently replaces itself.
- `periodicSyncForUpdates: 3600` – re-checks every hour.
- `installPrompt: true` – exposes the browser install prompt.
- Old caches cleaned up on SW activation (`cleanupOutdatedCaches: true`).

---

## Testing

### Unit & Integration (Vitest)

Two projects defined in `vitest.config.ts`:

- **`unit`** – plain Vitest with happy-dom. Files: `tests/unit/**`.
- **`nuxt`** – `@nuxt/test-utils` environment. Files: `tests/nuxt/**`.

Useful commands:
```bash
pnpm test                    # run all
pnpm test:unit               # unit only
pnpm test:nuxt               # nuxt integration only
pnpm exec vitest --project nuxt --run tests/nuxt/pages.test.ts  # single file
```

### E2E (Playwright)

Config: `playwright.config.ts`. Tests live in `tests/e2e/`.

```bash
pnpm test:e2e        # headless
pnpm test:e2e:ui     # Playwright UI mode
```

---

## Adding a New Game

1. **Composable** – create `app/composables/useMyGame.ts` following the load/save/reset pattern. Pick a unique `localStorage` key.
2. **Page** – add `app/pages/sheets/my-game.vue` (or top-level for non-sheet games). Call `load()` on `onMounted`, call `save()` on every mutation.
3. **i18n** – add keys under a new `myGame.*` namespace in both `locales/en.json` and `locales/de.json`.
4. **Home card** – add a card entry to `app/pages/index.vue` linking to the new page.
5. **History** (optional) – extend `useGameHistory` with a new entry type and storage key; wire up a history save call on game-over; add the history panel in `app.vue` for the new route.
6. **Multiplayer** (optional) – add the `GameId` to `VALID_GAMES` in `server/api/game-mp.ts`; create a `useMyGameMultiplayer.ts` that wraps `useMultiplayer<TState>`.
7. **Tests** – add a page route test in `tests/nuxt/pages.test.ts` and unit tests in `tests/unit/`.
