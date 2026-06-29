---
description: TypeScript naming, import ordering, and code organization conventions for this monorepo
globs: "**/*.ts,**/*.tsx"
---

# Coding Style

## Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase`
- Functions & variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` for true module-level constants, `camelCase` for typed `as const` objects
- Types & interfaces: `PascalCase`; prefer `type` over `interface` unless extending

## Imports

- Order: external packages → internal workspace packages (`@student-performance/*`) → relative paths
- Use named imports; avoid default-export-only modules where possible
- No barrel files (`index.ts` that re-export everything) — import from the specific module path

## TypeScript

- Always declare explicit return types on exported functions
- Prefer `type` aliases; use `interface` only when declaration merging is needed
- Use `unknown` over `any`; narrow with type guards
- Use `satisfies` for config objects instead of explicit casts
- Zod schemas live in `packages/env` (env vars) or co-located with their feature — share via workspace imports

## Formatting

Run `pnpm fix` (ultracite + biome) before committing — pre-commit hook enforces this automatically.
