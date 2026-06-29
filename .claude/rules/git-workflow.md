---
description: Branch naming, commit format, and PR guidelines
---

# Git Workflow

## Commit Messages

Use Conventional Commits format:

```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `ci`

Scopes (optional): `web` · `server` · `db` · `auth` · `api` · `ui`

Example: `feat(api): add todo router with create and list procedures`

## Branch Naming

```
feat/<short-description>
fix/<short-description>
chore/<short-description>
```

## Pre-commit Hook

The husky `pre-commit` hook runs `ultracite fix` automatically and re-stages formatted files. If it reports unfixable issues, resolve them before committing.

## PR Guidelines

- Keep PRs focused on one concern
- Update types and Zod schemas together with the implementation
- Run `pnpm check-types` before opening a PR
