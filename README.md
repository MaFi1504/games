# Game Sheets

A Progressive Web App for tracking scores in board and card games. Built with **Nuxt 4**, **Nuxt UI**, and **Tailwind CSS v4**. All game state lives in the browser (`localStorage`); an optional Nitro WebSocket server enables real-time multiplayer.

> For a full architectural overview see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Games

| Game | Route | Description |
|---|---|---|
| Phase 10 | `/sheets/phase10` | Track completed phases and penalty scores |
| Kniffel | `/sheets/kniffel` | Standard (5-dice) and Extrem (6-dice) variants |
| Notizblock | `/sheets/notizblock` | Freeform multi-player score notepad |
| Sudoku | `/sudoku` | Client-side puzzle generator (easy / medium / hard) |
| 2048 | `/2048` | Tile-merging puzzle with selectable grid size (4×4, 6×6, 8×8) |

---

## Tech Stack

| Concern | Tool |
|---|---|
| Framework | Nuxt 4 |
| UI | Nuxt UI v4 + Tailwind CSS v4 |
| i18n | @nuxtjs/i18n (en / de, no URL prefix) |
| PWA | @vite-pwa/nuxt (Workbox, auto-update) |
| Testing | Vitest v4 (unit + Nuxt integration) + Playwright (e2e) |
| Linting | ESLint v10 via @nuxt/eslint |
| Package manager | pnpm |

---

## Development

### Prerequisites

- Node.js >= 20
- pnpm

### Install dependencies

```bash
pnpm install
```

### Start dev server (http://localhost:3000)

```bash
pnpm dev
```

### Type-check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

---

## Testing

```bash
pnpm test              # all tests (unit + nuxt integration)
pnpm test:unit         # Vitest unit tests only  (tests/unit/)
pnpm test:nuxt         # Nuxt integration tests  (tests/nuxt/)
pnpm test:e2e          # Playwright e2e          (tests/e2e/)
pnpm test:e2e:ui       # Playwright with UI mode
```

Run a single test file:

```bash
pnpm exec vitest --project nuxt --run tests/nuxt/pages.test.ts
```

---

## Production

Build:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

See the [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment) for hosting options.

---

## Docker

A `Dockerfile` and `docker-compose.yml` are included for containerised deployment:

```bash
docker compose up -d --build
```

---

## PWA

- Installs as a standalone app on mobile and desktop.
- Works fully offline (Workbox caches pages, JS/CSS bundles, and Google Fonts).
- Checks for updates every hour; shows an "Update Now" banner when a new version is available.
- All game data (localStorage) is preserved across updates.

### Install on device

**Mobile (iOS/Android):** open in Safari/Chrome → share menu → "Add to Home Screen".

**Desktop (Chrome/Edge):** look for the install icon in the address bar → "Install".

---

## i18n

Two locales, auto-detected via cookie:

| Code | Language |
|---|---|
| `en` | English (default) |
| `de` | Deutsch |

Translation files: `locales/en.json`, `locales/de.json`.

---

## Key localStorage Keys

| Key | Composable | Content |
|---|---|---|
| `phase10-game` | `usePhase10` | Active Phase 10 game state |
| `kniffel-game` | `useKniffel` | Active Kniffel game state |
| `notepad-game` | `useNotepad` | Notepad players and entries |
| `2048-game` | `use2048` | Active 2048 game state (grid, score, bestScore, gridSize) |
| `phase10-history` | `useGameHistory` | Last 20 completed Phase 10 games |
| `kniffel-history` | `useGameHistory` | Last 20 completed Kniffel games |

---

## Adding a New Game

See the **Adding a New Game** section in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a step-by-step guide.

---

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
