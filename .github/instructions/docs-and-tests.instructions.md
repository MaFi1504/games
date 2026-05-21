---
description: "Use when implementing features, adding games, changing composables, modifying routes, updating i18n, or any other code change. Covers keeping README, docs/ARCHITECTURE.md, and docs feature summaries in sync, and running tests after changes."
---

# Docs & Test Maintenance

## After Every Code Change

### 1. Update tests

- If a composable, component, or page is added or modified, update or add the corresponding test.
- Unit tests live in `tests/unit/`. Nuxt integration tests live in `tests/nuxt/`. E2E tests live in `tests/e2e/`.
- Run the relevant test suite after the change:

```bash
pnpm test:unit    # composable / utility changes
pnpm test:nuxt    # page / routing / SSR changes
pnpm test:e2e     # full user-flow changes
```

- If all tests pass, briefly confirm it. If any fail, fix them before considering the task done.

### 2. Update README.md

Update the root `README.md` when:
- A new game or route is added → update the **Games** table.
- A new localStorage key is introduced → update the **Key localStorage Keys** table.
- A new npm script is added → update the **Development** or **Testing** section.
- Dependencies or the tech stack changes → update the **Tech Stack** table.

### 3. Update docs/ARCHITECTURE.md

Update `docs/ARCHITECTURE.md` when:
- A new composable is added → add an entry under **Composables** with state shape and localStorage key.
- A new page/route is added → add it to the **Routing** table.
- The multiplayer protocol changes → update **Multiplayer Server**.
- PWA/Workbox caching rules change → update the **PWA & Caching** table.
- i18n namespaces change → update the **i18n** section.
- A new component is introduced with non-trivial behavior → note it under **App Shell** or add a **Components** section.

### 4. Update docs/ feature summaries

The `docs/` folder is the quick-reference source for future development tasks. When adding a significant new feature:
- If the feature is large enough to warrant its own file (e.g. a new game, a new multiplayer flow), create `docs/<FEATURE>.md` with:
  - A one-paragraph summary of what it does.
  - Key files involved (composables, pages, components).
  - Any non-obvious design decisions.
- If the feature is small, add a brief note to an existing docs file or to `docs/ARCHITECTURE.md`.

## Rules

- Never leave docs in a stale state after a code change — update them in the same task.
- Never mark a task complete if tests were changed but not run.
- Keep docs concise: tables and bullet points over prose.
- Do not duplicate content between README and ARCHITECTURE — README is the entry point, ARCHITECTURE is the deep dive.
