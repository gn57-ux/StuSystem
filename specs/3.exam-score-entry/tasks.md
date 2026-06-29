# exam-score-entry — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始任务 |

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo
- specs 路径: specs/3.exam-score-entry/

## 任务列表

### 功能 1: 考试管理

- [x] T-001: 考试 tRPC router — 新建 `packages/api/src/routers/exam.ts`，实现 list/getById/create（含 examClasses + examSubjects 关联写入）/update/publish（状态流转 + 触发排名） ~30min
- [x] T-002: 考试管理页面 — `apps/web/src/routes/_auth/exams/index.tsx`：考试列表 Table（含状态 Badge）+ 新增 Dialog（多选班级、多选科目+满分输入） ~30min

### 功能 2: 成绩录入

- [x] T-003: 成绩 tRPC router — 新建 `routers/score.ts`，实现 listByExamClass（返回 students×subjects 矩阵）/ batchUpsert（已发布拒绝修改）/ computeRanks ~30min
- [x] T-004: 成绩录入表格组件 — `components/score-entry-table.tsx`：原生 `<table>`，controlled inputs（ScoreGrid Map 状态），Tab/Enter 焦点跳转 onKeyDown ~30min
- [x] T-005: 成绩校验 + 状态切换 + 离开提醒 — onBlur 超满分校验（单元格标红+tooltip）；右键/下拉切换缺考/免考状态；TanStack Router beforeLeave guard 弹 AlertDialog ~30min
- [x] T-006: 草稿保存 + 提交流程 — `apps/web/src/routes/_auth/exams/score-entry.tsx`：去抖 2s 自动调用 batchUpsert；顶部 Bar 显示考试信息+「保存草稿」+「提交发布」按钮 ~15min

### 功能 3: CSV 成绩导入

- [x] T-007: CSV 成绩导入组件 — `components/score-import-dialog.tsx`：FileReader 解析 CSV → 状态字段映射 → 与 examSubjects 满分对比校验 → 预览 Table → 调用 score.csvImport → 结果展示 ~30min

## 依赖关系

- T-001 依赖 2.T-001（classes 表）、2.T-003（subjects 表）
- T-002 依赖 T-001
- T-003 依赖 T-001
- T-004 依赖 T-003
- T-005 依赖 T-004
- T-006 依赖 T-003、T-004、T-005
- T-007 依赖 T-003

## 风险点

- Tab/Enter 焦点跳转在最后一格时需环绕处理，避免焦点丢失
- batchUpsert 数据量可能较大（30学生×8科目 = 240条），需确认 tRPC 默认请求体大小限制
- computeRanks 在发布时同步执行，如数据量大可能造成响应慢 → MVP 可接受，后续考虑异步
