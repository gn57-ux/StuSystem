# reports-export — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/db（新增 exam_class_comments 表）、packages/api/routers/report.ts（新增）、apps/web/src/routes/_auth/reports/

## 功能模块设计

### 模块 1: 数据库扩展（packages/db/src/schema/）

```ts
// exam_class_comments.ts（新增）
export const examClassComments = pgTable('exam_class_comments', {
  id: serial('id').primaryKey(),
  examId: integer('exam_id').references(() => exams.id).notNull(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  content: text('content').notNull().default(''),
  authorId: text('author_id').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({ uniq: unique().on(t.examId, t.classId) }));
```

### 模块 2: 报告 tRPC Router（packages/api/src/routers/report.ts）

```ts
reportRouter.classReport({ examId, classId })
→ {
    stats: ClassStats,        // 复用 analyticsRouter.classStats
    rankChanges: RankChanges, // 复用 analyticsRouter.classRankChanges
    alerts: StudentAlert[],
    comment: string,
  }

reportRouter.studentReport({ studentId, examId })
→ {
    student: Student,
    latestScores: SubjectScore[],
    scoreHistory: ScoreHistory,
    alerts: StudentAlert[],
    recentNotes: TeacherNote[],  // 最近 3 条
  }

reportRouter.saveComment({ examId, classId, content })
→ upsert exam_class_comments

// 成绩 CSV 导出数据
reportRouter.exportScores({ examId, classId, subjectId? })
→ { rows: ExportRow[] }
// ExportRow: { studentNo, studentName, subjectName, score, fullScore, status, rankInClass }
```

### 模块 3: 班级报告页（apps/web/src/routes/_auth/reports/class.tsx）

**布局（打印优化）:**

```
┌──────────────────────────────────────────────────────┐
│ [仅屏幕] 筛选：考试 Select + 班级 Select + 打印按钮   │
├──────────────────────────────────────────────────────┤
│ 报告标题：{班级名} {考试名} 成绩分析报告              │
│ 生成日期：{date}                                      │
├──────────────────────────────────────────────────────┤
│ 指标卡片行（平均分、及格率、优秀率、学生数）           │
├──────────────────────────────────────────────────────┤
│ 分数段分布图（复用 score-distribution-bar）           │
│ 科目均分对比（复用 subject-avg-bar）                  │
├──────────────────────────────────────────────────────┤
│ 进步 Top5 | 退步 Top5（Table）                        │
│ 重点关注学生（Table：姓名 + 预警类型）                 │
├──────────────────────────────────────────────────────┤
│ 教师评语（Textarea，onBlur 自动保存）                  │
└──────────────────────────────────────────────────────┘
```

### 模块 4: 学生报告页（apps/web/src/routes/_auth/reports/student.tsx）

- 从学生管理页或学生详情页入口跳转（带 studentId + examId）
- 展示内容：基础信息卡 + 最近考试成绩表 + 趋势折线图 + 雷达图 + 预警摘要 + 教师备注（最近 3 条）
- 复用所有已有图表组件

### 模块 5: CSV 导出（前端生成）

```ts
// apps/web/src/utils/export-csv.ts
export function downloadCsv(rows: ExportRow[], filename: string) {
  const header = ['学号', '姓名', '科目', '分数', '满分', '状态', '班级排名'];
  const lines = [header.join(','), ...rows.map(r => [...].join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

BOM (`﻿`) 确保 Windows Excel 正确识别 UTF-8。

### 模块 6: 打印样式（apps/web/src/index.css 追加）

```css
@media print {
  aside, nav, header, .no-print { display: none !important; }
  main { margin: 0; padding: 0; }
  body { font-size: 12pt; color: #000; }
}
```

## 接口契约

| Procedure | 权限 |
| --- | --- |
| report.classReport / studentReport | protectedProcedure |
| report.saveComment | protectedProcedure |
| report.exportScores | protectedProcedure |

## 安全考虑

- CSV 导出数据在服务端查询后返回给前端，不经过服务端文件系统，无文件残留风险
- `saveComment` 记录 authorId（ctx.user.id），不允许前端传入

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| PDF 导出 | 浏览器 window.print() | 无需服务端 PDF 库，MVP 足够，打印预览直观 |
| CSV 生成 | 前端 Blob | 无需服务端文件 I/O，数据量小，实时生成 |
| 教师评语存储 | exam_class_comments 独立表 | 与 teacher_notes（学生维度）区分，查询更清晰 |
