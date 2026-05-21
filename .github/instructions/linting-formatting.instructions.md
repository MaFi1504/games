---
description: "Use when writing or modifying any TypeScript, Vue, or JavaScript file. Covers ESLint rules, code formatting conventions, and running the linter after changes."
applyTo: "**/*.{ts,vue,mjs,js}"
---

# Linting & Formatting

## Run the linter after changes

Always run ESLint after modifying or creating any `.ts`, `.vue`, `.mjs`, or `.js` file:

```bash
pnpm lint
```

Fix all reported errors before considering the task done. Do not suppress or ignore lint errors unless there is an explicit, documented reason.

## Code style conventions

These conventions are enforced by `@nuxt/eslint` and must be followed in all new code:

- **Indentation**: 2 spaces. Never tabs.
- **Quotes**: single quotes for strings in TypeScript/JavaScript. Template literals only when interpolation is needed.
- **Semicolons**: none (ASI). Do not add trailing semicolons.
- **Trailing commas**: required for multi-line arrays and objects.
- **Line length**: keep lines readable; prefer breaking long chains or argument lists across multiple lines.

## Vue SFC conventions

- Use `<script setup lang="ts">` for all new components.
- Order blocks: `<script>` → `<template>` → `<style>` (style only when needed).
- Prefer `const` over `let`; never use `var`.
- Use `defineProps` and `defineEmits` with TypeScript generics, not the object syntax.

## TypeScript

- Always annotate function return types explicitly when they are not trivially inferred.
- Prefer `type` over `interface` for object shapes unless declaration merging is needed.
- Use `unknown` instead of `any`. If `any` is unavoidable, add an inline comment explaining why.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of explicit null checks where appropriate.

## Auto-fix

ESLint can auto-fix many issues. If the linter reports fixable errors, run:

```bash
pnpm lint --fix
```

Review the diff after auto-fix before committing.
