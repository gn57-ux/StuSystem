---
description: Hono server and tRPC router conventions
globs: "apps/server/**,packages/api/**"
---

# Backend API

## tRPC Routers

- All routers live in `packages/api/src/routers/`; register them in `packages/api/src/routers/index.ts`
- Use `publicProcedure` for unauthenticated endpoints; use `protectedProcedure` (session-guarded) for anything requiring a logged-in user
- Validate all inputs with Zod `.input()` — never trust raw client data
- Return plain serialisable objects from procedures; do not return class instances or Drizzle row objects directly

## Context

- Request context (db, session, user) is built in `packages/api/src/context.ts`; extend it there — do not pass context through procedure arguments

## Hono

- Mount tRPC under `/trpc/*` and Better Auth under `/api/auth/*` (already configured in `apps/server/src/index.ts`)
- Add new Hono middleware globally in `apps/server/src/index.ts`; route-level middleware goes in the route handler
- Use `hono/logger` for request logging; do not add `console.log` to route handlers in production

## Error Handling

- Throw `TRPCError` with an appropriate `code` (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`, etc.)
- Do not leak stack traces or internal error details to the client
