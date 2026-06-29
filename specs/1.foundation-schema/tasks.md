# foundation-schema — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/1.foundation-schema/

## 任务列表

### 功能 1: 数据库 Schema

- [x] T-001: 基础实体 schema — 新建 `packages/db/src/schema/classes.ts`、`students.ts`、`subjects.ts`，含字段定义和外键索引 ~30min
- [x] T-002: 考试实体 schema — 新建 `exams.ts`、`exam_classes.ts`、`exam_subjects.ts`、`scores.ts`（含 unique 约束） ~30min
- [x] T-003: 辅助实体 schema — 新建 `teacher_notes.ts`、`student_alerts.ts`；更新 `packages/db/src/schema/index.ts` 导出所有表；运行 `pnpm db:generate` 验证 ~30min

### 功能 2: 认证与 tRPC 基础

- [x] T-004: Better Auth 角色集成 + tRPC context/procedures — 在 `packages/auth/src/index.ts` 添加 role additionalField；在 `packages/api/src/context.ts` 注入 session+user；在 `packages/api/src/trpc.ts` 实现 `protectedProcedure` 和 `adminProcedure` ~30min

### 功能 3: 前端 App Shell

- [x] T-005: App Shell 布局组件 — 在 `apps/web/src/routes/_auth.tsx` 实现侧边栏（含导航菜单）+ 顶部工具栏 + Outlet 布局；删除旧 todos 路由及相关 tRPC router ~30min
- [x] T-006: 路由守卫 + 登录页 + 全局 Provider — `_auth.tsx` beforeLoad 检查 session 未登录跳转 /login；整理 `__root.tsx` 中 QueryClient/tRPC provider；确认 `pnpm dev` 后跳转逻辑正确 ~30min

## 依赖关系

- T-002 依赖 T-001（外键）
- T-003 依赖 T-002（index.ts 汇总）
- T-004 依赖 T-003（db schema 完整）
- T-005 依赖 T-004（protectedProcedure 可用）
- T-006 依赖 T-005（布局存在）

## 风险点

- Better Auth additionalFields 的 role 字段在 session 中的类型声明需要手动扩展，否则 TypeScript 报错
- `pnpm db:generate` 首次运行可能需要先配置 drizzle.config.ts 的 DATABASE_URL
