# data-management — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/2.data-management/

## 任务列表

### 功能 1: 班级与科目管理

- [x] T-001: 班级 tRPC router — 新建 `packages/api/src/routers/class.ts`，实现 list/create/update/delete（delete 检查学生数，有则抛 CONFLICT）；在 `index.ts` 注册 ~30min
- [x] T-002: 班级管理页面 — `apps/web/src/routes/_auth/settings/classes.tsx`：Table + 新增/编辑 Dialog + 删除确认 Dialog，TanStack Form + Zod 校验 ~30min
- [x] T-003: 科目 tRPC router + 管理页 — 新建 `routers/subject.ts`（list/create/update/delete，delete 检查 examSubjects 关联）；前端 `settings/subjects.tsx` 同上 ~30min

### 功能 2: 学生 CRUD

- [x] T-004: 学生 tRPC router — 新建 `routers/student.ts`，实现 list（含分页+搜索+班级筛选）/ getById / create / update / updateStatus；Zod schema 校验；数据库层 unique 索引（class_id + student_no）~30min
- [x] T-005: 学生管理页面 — `apps/web/src/routes/_auth/students/index.tsx`：TanStack Table + debounced 搜索 Input + 班级 Select 筛选 + Pagination；新增/编辑 Dialog ~30min

### 功能 3: CSV 批量导入

- [x] T-006: 学生 bulkImport tRPC procedure — 在 `routers/student.ts` 添加 bulkImport，事务内逐行 upsert，匹配班级名称，收集错误行返回 `{ success, errors }` ~30min
- [x] T-007: CSV 导入组件 — `apps/web/src/components/student-import-dialog.tsx`：文件选择 → 原生 FileReader 解析 CSV → 预览 Table（错误行标红）→ 确认调用 bulkImport → 结果展示 ~30min

## 依赖关系

- T-002 依赖 T-001
- T-003 相对独立（科目无外键依赖班级）
- T-004 依赖 1.T-001（students 表存在）
- T-005 依赖 T-004
- T-006 依赖 T-004
- T-007 依赖 T-006

## 风险点

- CSV 导入中班级名称匹配：如果班级名有空格或大小写差异，需做 trim/normalize 处理
- TanStack Table 分页与 tRPC 分页参数同步：需 `keepPreviousData` 避免翻页时闪烁
