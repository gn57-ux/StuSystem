---
description: Testing conventions for the student-performance monorepo
---

# Testing

## General

- Write tests inside `it()` or `test()` blocks; all assertions belong inside them
- Use `async/await` — never done-callback style
- Do not commit `.only` or `.skip`
- Keep `describe` nesting shallow (max 2 levels)

## Placement

- Unit tests: co-located as `*.test.ts` / `*.test.tsx` next to the source file
- Integration tests (API/db): `packages/api/src/__tests__/` or `apps/server/src/__tests__/`

## tRPC / API tests

- Test tRPC routers through the `createCallerFactory` helper — do not spin up HTTP servers for unit tests
- Use a real PostgreSQL connection (test database) for integration tests; do not mock Drizzle queries

## Frontend

- Prefer testing user-visible behavior over implementation details
- Test form validation, route transitions, and query states

## Running tests

```bash
pnpm test           # all packages (if configured)
```
