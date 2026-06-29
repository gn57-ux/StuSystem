# student-analysis — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/api/routers/student.ts（扩展）+ analytics.ts（扩展）、apps/web/src/routes/_auth/students/[id].tsx

## 功能模块设计

### 模块 1: 学生成绩历史 tRPC Procedures

扩展 `packages/api/src/routers/student.ts`：

```ts
studentRouter.getScoreHistory(studentId)
→ {
    exams: { examId, examName, examDate, totalScore, classRank }[],
    // 历次考试按 examDate 升序，最多 20 条
  }

studentRouter.getSubjectHistory(studentId, subjectId)
→ { exams: { examId, examName, examDate, score, classSubjectRank }[] }

studentRouter.getLatestSubjectScores(studentId)
→ { subject: Subject, score: number, fullScore: number, classAvg: number }[]
// 最近一次已发布考试的各科成绩
```

扩展 `packages/api/src/routers/analytics.ts`：

```ts
analyticsRouter.studentAlerts(studentId)
→ StudentAlert[]（status = 'open'）

analyticsRouter.resolveAlert(alertId, status: 'confirmed' | 'ignored', note?)
→ 更新 student_alerts.status
```

新增 `packages/api/src/routers/note.ts`：

```ts
noteRouter.list(studentId)           → TeacherNote[]（含 author.name，倒序）
noteRouter.create({ studentId, content }) → TeacherNote
// 备注关联当前登录用户（ctx.user.id）
```

### 模块 2: 偏科度计算

在 `getLatestSubjectScores` 返回结果时附加计算：

```ts
// 标准化分 = score / fullScore * 100（统一到百分制）
// 偏科度 = max(标准化分) - min(标准化分)
// 偏科提示：偏科度 > 30 → 提示「偏科较明显」
```

### 模块 3: 学生详情页（apps/web/src/routes/_auth/students/$studentId.tsx）

**页面布局（两列）:**

```
┌─────────────────────┬────────────────────────┐
│ 基础信息卡           │ 排名摘要 + 各科最近成绩 │
├──────────────────────┴────────────────────────┤
│ [Tab] 总分趋势  [Tab] 单科趋势  [Tab] 排名变化  │
│ (Recharts LineChart)                           │
├────────────────────────────────────────────────┤
│ 科目雷达图（左）  预警区域（右）               │
├────────────────────────────────────────────────┤
│ 教师备注                                       │
└────────────────────────────────────────────────┘
```

**图表组件（复用 charts/ 目录）:**

```ts
// apps/web/src/components/charts/trend-line.tsx
// Props: data: { label: string, value: number }[], yAxisLabel: string
// 复用于总分趋势、单科趋势、排名变化（排名Y轴需倒序 reversed）

// apps/web/src/components/charts/subject-radar.tsx
// Props: data: { subject: string, value: number }[] （标准化百分制）
// Recharts RadarChart + Radar + PolarGrid + PolarAngleAxis
```

**科目切换（单科趋势）:**

- shadcn `<Select>` 切换科目
- 切换后调用 `studentRouter.getSubjectHistory(studentId, subjectId).useQuery()`

**预警区域:**

- 列表展示 StudentAlert，alertType 映射为中文 Badge（color: orange for warning）
- 每条预警有「确认」「忽略」按钮，调用 `resolveAlert` 后 invalidate queries

**教师备注:**

- 底部 `<Textarea>` + 「添加备注」按钮（`noteRouter.create`）
- 乐观更新：提交后立即在列表顶部插入（TanStack Query optimistic updates）

## 接口契约

| Procedure | 权限 |
| --- | --- |
| student.getScoreHistory/getSubjectHistory/getLatestSubjectScores | protectedProcedure |
| analytics.studentAlerts | protectedProcedure |
| analytics.resolveAlert | protectedProcedure（teacher 可操作） |
| note.list/create | protectedProcedure |

## 安全考虑

- `note.create` 从 `ctx.user.id` 取作者，不接受前端传入 authorId
- `resolveAlert` 不校验操作者身份（MVP），后续可加「仅操作者或 admin 可修改」

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 趋势图 | Recharts LineChart | 与 feature 4 图表统一，复用 trend-line 组件 |
| 雷达图 | Recharts RadarChart | Recharts 原生支持，无需额外依赖 |
| 科目切换状态 | URL search param subjectId | 可分享链接、刷新保持 |
| 备注乐观更新 | TanStack Query optimistic | 提升响应感，失败自动回滚 |
