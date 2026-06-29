---
description: Drizzle ORM and PostgreSQL conventions
globs: "packages/db/**"
---

# Database

## Schema

- All table definitions live in `packages/db/src/schema/`; export every table from `packages/db/src/schema/index.ts`
- Use Drizzle's `pgTable` with snake_case column names
- Always define `id` as `serial('id').primaryKey()` or `uuid('id').defaultRandom().primaryKey()`
- Add `createdAt` and `updatedAt` timestamps to every table

## Migrations

- Generate migrations with `pnpm db:generate` (drizzle-kit)
- Apply with `pnpm db:migrate` in CI/production — never use `db:push` in production
- `db:push` is for local development only (bypasses migration files)
- Do not edit generated migration files manually

## Queries

- Access the db through the singleton `db` exported from `packages/db/src/index.ts`
- Prefer Drizzle's typed query builder over raw SQL; use `sql` template tag only when the builder is insufficient
- Wrap multi-step operations in a transaction: `db.transaction(async (tx) => { ... })`
- Keep query logic in the tRPC router or a dedicated service file — not inside React components

## Drizzle Studio

Run `pnpm db:studio` to open the Drizzle visual inspector locally.
