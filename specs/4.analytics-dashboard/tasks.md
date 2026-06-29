# analytics-dashboard — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/4.analytics-dashboard/

## 任务列表

### 功能 1: 统计计算 API

- [x] T-001: 统计聚合 tRPC procedure — 新建 `packages/api/src/routers/analytics.ts`，实现 classStats（SQL 聚合：avg/max/min/stddev/分数段/科目均分/上次对比）和 classRankChanges（进退步 Top5）；注册到 index.ts ~30min

### 功能 2: 数据看板页

- [x] T-002: 数据看板页 — `apps/web/src/routes/_auth/index.tsx`：4 个统计卡片（shadcn `<Card>`）+ URL search params 联动（examId, classId）；安装 recharts `pnpm --filter web add recharts` ~30min
- [x] T-003: 图表组件 — 新建 `apps/web/src/components/charts/score-distribution-bar.tsx`（分数段柱状图）和 `subject-avg-bar.tsx`（科目均分对比）；集成到看板页 ~30min

### 功能 3: 班级与科目分析页

- [x] T-004: 班级分析页 — `apps/web/src/routes/_auth/analytics/class.tsx`：pass-rate-pie（环形图）+ 与上次考试对比 Bar + 进步/退步 Top5 列表；复用 T-003 组件 ~30min
- [x] T-005: 科目分析页 — `apps/web/src/routes/_auth/analytics/subject.tsx`：科目筛选 Select + 学生单科排名 Table + 低分学生列表；subjectStats procedure ~30min

### 功能 4: 重点关注学生

- [x] T-006: 预警规则计算 + 重点关注列表 — 在 `analytics.ts` 添加 computeAlerts procedure（5类预警规则计算后批量 upsert student_alerts）；在 `exam.publish` 调用；看板页展示 alerts 列表（学生名 + 预警类型 Badge）~30min

## 依赖关系

- T-001 依赖 3.T-003（scores 表有数据）
- T-002 依赖 T-001
- T-003 依赖 T-002
- T-004 依赖 T-001、T-003
- T-005 依赖 T-001
- T-006 依赖 T-001；3.T-001（exam.publish 调用入口）

## 风险点

- PostgreSQL `PERCENTILE_CONT` 在 Drizzle 中需用 `sql` 模板，注意 SQL 注入防范（参数化）
- Recharts 在 SSR/Vite 环境下可能需要动态 import 处理（Vite 是 CSR，一般无问题）
- computeAlerts 在发布时同步执行，数据量大时可能慢 → MVP 可接受，后续改异步任务
