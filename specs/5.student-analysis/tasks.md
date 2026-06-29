# student-analysis — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/5.student-analysis/

## 任务列表

### 功能 1: 学生成绩历史 API

- [x] T-001: 学生成绩历史 procedures — 在 `packages/api/src/routers/student.ts` 添加 getScoreHistory / getSubjectHistory / getLatestSubjectScores（含偏科度计算）；在 `analytics.ts` 添加 studentAlerts / resolveAlert ~30min

### 功能 2: 教师备注 API

- [x] T-002: 备注 tRPC router — 新建 `packages/api/src/routers/note.ts`，实现 list（join user 表取 name）/ create（从 ctx.user.id 取 authorId）；注册到 index.ts ~30min

### 功能 3: 学生详情页

- [x] T-003: 学生详情页基础区域 — `apps/web/src/routes/_auth/students/$studentId.tsx`：基础信息卡 + 排名摘要卡 + 各科最近成绩表格（调用 getLatestSubjectScores）~30min
- [x] T-004: 图表区域 — 趋势图 Tab 组（总分/单科/排名），复用 `charts/trend-line.tsx`（排名 Y 轴设置 reversed）；新建 `charts/subject-radar.tsx`（Recharts RadarChart）~30min
- [x] T-005: 教师备注组件 — 备注列表（倒序）+ Textarea + 提交按钮；TanStack Query 乐观更新；集成到详情页底部 ~30min
- [x] T-006: 预警展示与处理 — 预警列表区域（alertType → 中文 Badge）+ 确认/忽略按钮（resolveAlert mutation + query invalidation）~15min

## 依赖关系

- T-001 依赖 4.T-006（student_alerts 数据已有）
- T-002 相对独立（teacherNotes 表在 feature 1 已定义）
- T-003 依赖 T-001
- T-004 依赖 T-001、T-003（页面已有数据流）
- T-005 依赖 T-002、T-003（页面框架存在）
- T-006 依赖 T-001、T-003

## 风险点

- Recharts RadarChart 数据格式需要每个 subject 作为 dataKey，多科目时需动态生成 `<Radar>` 组件
- 学生详情页路由 `$studentId` 为动态段，需在 TanStack Router 中正确定义 `loader`
- 乐观更新失败时 TanStack Query 会自动回滚，但需设置 `onError` 显示 toast 提示
