# LESSONS — 架构决策与踩坑记录

## 2026-06-29 — foundation-schema / T-001-T-003: Schema 循环依赖

**问题**: `classes.ts` 的 relations 需要引入 `students.ts`，`students.ts` 已引入 `classes.ts`（外键），形成循环依赖。

**解法**: 所有跨表 relations 集中到 `packages/db/src/schema/relations.ts`，classes.ts / students.ts 等各自只定义 table，不导入其他 table。

**影响**: 后续新增 feature 的表，relations 一律追加到 relations.ts，不在各自文件内定义。

---

## 2026-06-29 — foundation-schema / T-003: schema/index.ts barrel file 警告

**问题**: Biome 对 `schema/index.ts` 的 `export * from` 报 "barrel file" 警告。

**理由**: Drizzle ORM 的 `drizzle()` 函数需要 `schema` 对象包含所有表，必须使用 barrel 导出，该警告是合理例外。

**处理**: 保留 barrel file，视为设计必要。

---

## 2026-06-29 — foundation-schema / T-004: Better Auth role 字段类型

**问题**: Better Auth session user 对象的 `role` 字段不在默认类型定义中，直接访问 `ctx.user.role` 会 TS 报错。

**解法**: 使用 `const user = ctx.user as typeof ctx.user & { role?: string }` 做类型扩展，在 `adminProcedure` 内使用。后续若 Better Auth 更新了 additionalFields 的类型推断，可移除 cast。

---

## 2026-06-29 — foundation-schema / T-005: TanStack Router 路由类型与未来路由

**问题**: 侧边栏 NAV_ITEMS 中的路由（`/students`、`/exams` 等）在 Feature 2+ 才创建，当前 TypeScript 报 `navigate({ to })` 类型不兼容。

**解法**: `navigate({ to: to as never })` 临时绕过类型检查。后续路由文件创建后 TanStack Router 会自动推断，届时可移除 cast。

---

## 2026-06-29 — foundation-schema / T-005: fumadocs 嵌套 biome.json

**问题**: `pnpm fix`（ultracite）在根目录运行时因 apps/fumadocs/biome.json 嵌套配置报错退出。

**解法**: 针对修改的目录单独运行 `npx biome check --write <paths>`，跳过 fumadocs。这是项目预存问题，不影响其他包。

---

## 2026-06-29 — data-management / T-007: Biome useConsistentTypeDefinitions

**问题**: Biome（ultracite 配置）要求用 `interface` 代替 `type` 定义对象类型，并追加 `useSortedInterfaceMembers`（接口字段按字母排序）。

**解法**: 新建文件中对象类型统一用 `interface`，union type 继续用 `type`；接口字段按字母序排列，或运行 `biome check --write` 自动修复。

---

## 2026-06-29 — data-management / T-007: Biome useTopLevelRegex

**问题**: 函数内直接写 `/\r?\n/` 会触发 `lint/performance/useTopLevelRegex`——函数每次调用都会重建 RegExp 对象。

**解法**: 将 regex 提取为模块顶层 `const CSV_LINE_SPLIT = /\r?\n/`，函数内引用该常量。

---

## 2026-06-29 — exam-score-entry / T-004: TypeScript noUncheckedIndexedAccess 守卫

**问题**: `tsconfig.json` 开启了 `noUncheckedIndexedAccess: true`，`array[i]` 返回 `T | undefined`，直接使用会 TS 报错。

**解法**: 在 for 循环内加 `const item = arr[i]; if (!item) continue;` 守卫。也可以改用 `for...of` 配合 entries 完全回避。

---

## 2026-06-29 — exam-score-entry / T-004: Biome noExcessiveCognitiveComplexity

**问题**: `handleKeyDown` 包含多层 if/else 导致认知复杂度超阈值。

**解法**: 将分支逻辑提取为独立命名函数（如 `handleTabNav`），让顶层函数只做 key dispatch，各分支函数各自简单。

---

## 2026-06-29 — analytics-dashboard / T-001: Drizzle subquery type for inArray

**问题**: 将 `db.select().from().where()` 结果作为函数参数类型 `ReturnType<DbInstance["select"]>` 传给 `inArray`，TypeScript 报类型不兼容。

**解法**: 改为先 await 得到 ID 数组（`studentIds: number[]`），再传给 `inArray`。避免将 Drizzle 内部 builder 类型作为函数参数。

---

## 2026-06-29 — analytics-dashboard / T-001: Biome useAwait false positive

**问题**: `async function collectLowRankAlerts(...)` 无 await，Biome 报 `lint/suspicious/useAwait`。

**解法**: 移除 `async` 关键字，返回 `AlertRow[]` 而非 `Promise<AlertRow[]>`。只有真正需要 await 的函数才加 async。

---

## 2026-06-29 — reports-export / T-002: student.list 返回分页对象非数组

**问题**: `trpc.student.list.queryOptions()` 默认值 `= []` 后直接 `.find()/.map()` 报 TypeScript 错误，因为返回的是 `{ data, total, page, pageSize }` 对象，不是数组。

**解法**: `const studentList = studentListData?.data ?? []`，提取 `.data` 字段后再操作。适用所有分页 list procedures。

---

## 2026-06-29 — reports-export / T-004: enabled:false + refetch 模式

**问题**: CSV 导出是「按需」动作，不应在页面加载时自动触发，但需要复用 tRPC query 的类型推断。

**解法**: `useQuery({ enabled: false, ... })` 配合 `const { refetch } = ...`，按钮 onClick 调用 `await refetch()` 获取数据，再用 Blob 下载。

---

## 2026-06-29 — student-analysis / T-003: $studentId.tsx useFilenamingConvention

**问题**: TanStack Router 动态路由文件命名 `$studentId.tsx` 中的 `$` 前缀触发 Biome `lint/style/useFilenamingConvention`。

**解法**: 文件第一行加 `// biome-ignore lint/style/useFilenamingConvention: TanStack Router dynamic route segment`。这是框架约定，无法改名。

---

## 2026-06-29 — student-analysis / T-003: noExcessiveCognitiveComplexity 组件拆分

**问题**: 包含多个 useQuery + 多个派生变量 + 复杂 JSX 的页面级组件超过认知复杂度阈值。

**解法**: 将有独立 state 的子区域（如图表 Tab 组）提取为独立命名组件（`ChartSection`），使主组件只做数据传递和顶层布局。

---

## 2026-06-29 — student-analysis / T-005: TanStack Query 乐观更新类型

**问题**: `qc.setQueryData()` 的 updater 函数参数类型为 `T[] | undefined`，若直接声明为 `T[]` 则 TypeScript 报错。优化 note 中 `createdAt: new Date()` 与 tRPC 返回类型 `string` 不匹配。

**解法**: updater 不显式声明参数类型（让 TypeScript 推断 `T[] | undefined`）；新 note 的 `createdAt` 用 `new Date().toISOString()`（tRPC 无 superjson 时 timestamp 序列化为字符串）。

---

## 2026-06-29 — exam-score-entry / T-006: useBlocker API

**问题**: TanStack Router v1 的 `useBlocker` 返回 `{ proceed, reset, status }`，`status === "blocked"` 时显示弹窗，`proceed()` / `reset()` 分别确认/取消离开。

**解法**: `const { proceed, reset, status } = useBlocker({ condition: hasDirty && !isPublished })`，配合 AlertDialog 的 `open={status === "blocked"}`。
