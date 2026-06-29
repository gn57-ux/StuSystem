# reports-export — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/6.reports-export/

## 任务列表

### 功能 1: 报告 API 与数据层

- [x] T-001: schema + report tRPC router — 新建 `packages/db/src/schema/exam_class_comments.ts` 并更新 index.ts；运行 `db:generate`；新建 `packages/api/src/routers/report.ts` 实现 classReport / studentReport / saveComment / exportScores ~30min

### 功能 2: 班级报告页

- [x] T-002: 班级报告页 — `apps/web/src/routes/_auth/reports/class.tsx`：复用 score-distribution-bar + subject-avg-bar 图表；指标卡片 + 进退步 Top5 + 重点关注学生 Table；教师评语 Textarea（onBlur 调用 saveComment）~30min

### 功能 3: 学生报告页

- [x] T-003: 学生报告页 — `apps/web/src/routes/_auth/reports/student.tsx`：复用 trend-line + subject-radar 图表；基础信息 + 最近成绩表 + 预警摘要 + 教师备注（最近 3 条）~30min

### 功能 4: CSV 导出与打印样式

- [x] T-004: CSV 导出工具 + 打印样式 — 新建 `apps/web/src/utils/export-csv.ts`（Blob + BOM 处理）；在班级报告页添加「导出成绩 CSV」按钮；在 `apps/web/src/index.css` 追加 `@media print` 样式，隐藏侧边栏/按钮；测试打印预览 ~15min

## 依赖关系

- T-001 依赖 5.T-001（studentReport 复用学生成绩历史 API）、4.T-001（classReport 复用统计 API）
- T-002 依赖 T-001
- T-003 依赖 T-001
- T-004 依赖 T-002（CSV 导出按钮在报告页）

## 风险点

- CSV BOM 头（﻿）在非 Windows 平台打开时可能显示多余字符，可根据用户反馈决定是否保留
- `window.print()` 在某些浏览器需要用户手动选择「另存为 PDF」，无法程序化保存为文件 → MVP 可接受，说明提示
- exam_class_comments 的 upsert（`ON CONFLICT DO UPDATE`）需要 Drizzle onConflictDoUpdate 写法
