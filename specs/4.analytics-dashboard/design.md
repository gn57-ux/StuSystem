# analytics-dashboard — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/api/routers/analytics.ts、apps/web/src/routes/_auth/（dashboard、analytics/class、analytics/subject）

## 功能模块设计

### 模块 1: 统计计算 tRPC Router（packages/api/src/routers/analytics.ts）

```ts
analyticsRouter.classStats({ examId, classId })
→ {
    studentCount: number,
    avgTotal: number,
    maxTotal: number,
    minTotal: number,
    medianTotal: number,
    stddevTotal: number,
    passRate: number,      // 总分及格率
    excellentRate: number, // 总分优秀率
    lowRate: number,
    distribution: { range: string, count: number }[], // 分数段
    subjectAvgs: { subjectId, subjectName, avg }[],
    prevExamAvg: number | null, // 上次已发布考试的班均
  }

analyticsRouter.classRankChanges({ examId, classId })
→ {
    top5improved: { studentId, name, delta }[],
    top5declined: { studentId, name, delta }[],
  }

analyticsRouter.subjectStats({ examId, classId, subjectId })
→ {
    avg, max, min,
    studentRanks: { studentId, name, score, rank }[],
    lowScoreStudents: { studentId, name, score }[], // < 班均 - 15
    volatileStudents: { studentId, name, recentStddev }[],
  }

analyticsRouter.alerts({ examId, classId })
→ StudentAlert[]（含 studentName、alertType）
```

**SQL 聚合实现要点:**

- `AVG`, `MAX`, `MIN`, `STDDEV_POP` 在 PostgreSQL 直接支持
- 中位数用 `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_score)` 窗口函数
- 分数段用 `CASE WHEN score < 60 THEN '0-59' ...` + `COUNT GROUP BY`

### 模块 2: 预警规则计算（analytics.computeAlerts）

在 `exam.publish` 后服务端异步批量计算（或按需计算），结果存入 `student_alerts`：

| 规则 | 判断逻辑 |
| --- | --- |
| 明显退步 | 本次班级排名 vs 上次排名下降 ≥ 10 名 |
| 单科薄弱 | 某科得分 < 该科班均 − 15 |
| 总分低位 | 总分排名在班级后 20% |
| 波动较大 | 最近 3 次考试总分标准差 > 阈值（暂定15） |
| 偏科明显 | max(标准化科目分) − min(标准化科目分) > 阈值（暂定0.4） |

标准化分 = (score − subjectAvg) / subjectStddev

### 模块 3: Recharts 图表组件（apps/web/src/components/charts/）

**安装:**

```bash
pnpm --filter web add recharts
```

**组件列表:**

```
charts/
├── score-distribution-bar.tsx   # 分数段柱状图（BarChart + Bar + XAxis + YAxis + Tooltip）
├── subject-avg-bar.tsx          # 科目均分对比（同上，水平 layout）
├── pass-rate-pie.tsx            # 优秀率/及格率环形图（PieChart + Pie + Legend）
└── trend-line.tsx               # 复用于多处的折线图基础组件（后续 feature 也用）
```

所有图表组件接收纯数据 props，不内置数据获取逻辑（关注点分离）。

### 模块 4: 页面路由

```
routes/_auth/
├── index.tsx               ← 数据看板（Dashboard）
├── analytics/
│   ├── class.tsx           ← 班级分析
│   └── subject.tsx         ← 科目分析
```

页面通过 URL search params（`?examId=1&classId=2&subjectId=3`）传递筛选状态，与顶部工具栏联动。

## 接口契约

所有 analytics procedures 使用 `protectedProcedure`；`computeAlerts` 在 `exam.publish` 内由 `adminProcedure` 触发。

## 安全考虑

- Teacher 只能查看自己有权限的班级数据 → MVP 暂不强制（所有登录用户可查），后续版本加班级权限关联

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 统计计算位置 | 数据库 SQL 聚合 | 避免把大量 score 行传到应用层再计算 |
| 预警触发时机 | 发布时批量计算并存 student_alerts | 避免每次页面加载实时计算，查询性能好 |
| 图表库 | Recharts | 已确认，纯 React 组件，与 TanStack Query 数据流契合 |
