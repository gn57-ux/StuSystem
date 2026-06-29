---
description: React, TanStack Router, TanStack Query, and shadcn/ui conventions
globs: "apps/web/**"
---

# Frontend

## Routing (TanStack Router)

- Routes live in `apps/web/src/routes/` using file-based routing; `routeTree.gen.ts` is auto-generated — do not edit manually
- Use the `Route.useParams()` / `Route.useSearch()` hooks for type-safe param access
- Protected routes live under `routes/_auth/` — add new authenticated pages there

## Data Fetching (TanStack Query + tRPC)

- Use `trpc.<router>.<procedure>.useQuery()` and `.useMutation()` hooks from `@trpc/tanstack-react-query`
- Invalidate queries after mutations via `queryClient.invalidateQueries`
- Keep server state in TanStack Query; keep UI state in `useState` / `useReducer`

## Forms (TanStack Form + Zod)

- Use `@tanstack/react-form` with `@hookform/resolvers` and Zod schemas for validation
- Co-locate form schemas with the component that uses them

## UI Components (shadcn/ui)

- Shared primitives live in `packages/ui/src/components/` — add new shadcn components there via `pnpx shadcn add`
- Do not duplicate primitive components in `apps/web`; import from `@student-performance/ui`
- Theming tokens live in `packages/ui/src/styles/globals.css`

## Styling

- Tailwind CSS v4 — utility classes only; no custom CSS files outside `globals.css`
- Use `next-themes` via the provider in the root layout for dark/light mode

## Notifications

- Use `sonner` (`toast()`) for user-facing notifications; do not use `alert()`
