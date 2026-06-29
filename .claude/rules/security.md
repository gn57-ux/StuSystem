---
description: Security rules for environment variables, auth, and API endpoints
---

# Security

## Environment Variables

- All env vars are validated via Zod in `packages/env`; never access `process.env` directly outside that package
- Never hard-code secrets, API keys, or database URLs in source files
- `.env` and `.env.local` files are git-ignored — never commit them

## Authentication

- Auth is handled by Better Auth (`packages/auth`); do not roll custom session logic
- Protect tRPC procedures that require a logged-in user with a `protectedProcedure` (check `packages/api/src/context.ts`)
- Never expose the raw session token or user password hash in API responses

## API / Hono Server

- Validate all incoming data with Zod at the tRPC procedure boundary
- CORS is configured in `apps/server/src/index.ts` — keep `origin` to the known frontend URL via `env.CORS_ORIGIN`
- Use `credentials: true` only when necessary and `allowMethods` / `allowHeaders` as narrow as possible
- Prefer `POST` for mutation procedures; avoid `GET` for state-changing operations

## Frontend

- Add `rel="noopener noreferrer"` on all `target="_blank"` links
- Never use `dangerouslySetInnerHTML`
- Sanitize any user-supplied content before rendering as HTML
