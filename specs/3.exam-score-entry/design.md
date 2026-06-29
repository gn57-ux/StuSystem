# exam-score-entry — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/api/routers/（exam、score）、apps/web/src/routes/（考试管理、成绩录入）

## 功能模块设计

### 模块 1: 考试 tRPC Router（packages/api/src/routers/exam.ts）

```ts
examRouter.list({ status? })         → Exam[]（含关联班级名、科目数）
examRouter.getById(id)               → Exam + examClasses + examSubjects
examRouter.create({ name, type, examDate, classIds, subjects: { subjectId, fullScore }[] })
examRouter.update(id, { name, examDate }) // 不允许改 classIds/subjects（已有成绩时）
examRouter.publish(id)               → 状态变 published，触发排名计算
```

### 模块 2: 成绩 tRPC Router（packages/api/src/routers/score.ts）

```ts
// 按考试+班级加载该班级所有学生的成绩（如未录入则返回 pending 行）
scoreRouter.listByExamClass({ examId, classId })
  → { students: Student[], subjects: Subject[], scores: Score[][] }

// 批量 upsert（草稿保存 + 提交共用）
scoreRouter.batchUpsert({ examId, scores: { studentId, subjectId, score, status }[] })

// CSV 成绩导入
scoreRouter.csvImport({ examId, rows: { studentNo, subjectName, score, status }[] })
  → { success: number, errors: { row: number, reason: string }[] }

// 触发排名计算（examRouter.publish 内部调用）
scoreRouter.computeRanks(examId)
  → 按 classId 分组，计算每生总分 rank_in_class
```

### 模块 3: 成绩录入表格组件（apps/web/src/components/score-entry-table.tsx）

**数据结构（前端内存状态）:**

```ts
type CellState = {
  score: string;       // 编辑中的字符串（避免 number 精度问题）
  status: ScoreStatus; // normal/absent/exempt/pending
  isDirty: boolean;
  error?: string;      // 超满分等校验错误
};
// 二维 Map：studentId → subjectId → CellState
type ScoreGrid = Map<number, Map<number, CellState>>;
```

**表格结构（原生 table，非 TanStack Table）:**

- 表头行：固定列（学号、姓名）+ 动态科目列（含满分）
- 数据行：每生一行，每科一个可编辑 `<input type="text">`
- 单元格编辑：`onKeyDown` 处理 Tab（横向）、Enter（纵向）焦点跳转
- 校验：`onBlur` 时检查 > fullScore → 设置 error

**去抖保存:**

```ts
const debouncedSave = useDebouncedCallback(() => {
  batchUpsertMutation.mutate({ examId, scores: getDirtyScores(grid) });
}, 2000);
```

**离开提醒:**

```ts
// TanStack Router beforeLeave guard
router.subscribe('onBeforeLoad', ({ to, from }) => {
  if (hasDirtyScores && from.pathname.includes('/score-entry')) {
    // 弹出 AlertDialog 确认
  }
});
```

### 模块 4: CSV 成绩导入（apps/web/src/components/score-import-dialog.tsx）

**CSV 格式:**

```
学号,科目名称,分数,状态
20210001,数学,145,正常
20210002,数学,,缺考
```

**解析与校验:**

- 状态字段映射：正常→normal / 缺考→absent / 免考→exempt
- 分数 > 满分：标记错误（需先从 examSubjects 获取满分）
- 学号无法匹配学生：标记错误

## 接口契约

| Procedure | 权限 | 说明 |
| --- | --- | --- |
| exam.list/getById | protectedProcedure | 所有登录用户可读 |
| exam.create/update/publish | adminProcedure | 仅 admin |
| score.listByExamClass | protectedProcedure | 所有登录用户 |
| score.batchUpsert | protectedProcedure | teacher 也可录入 |
| score.csvImport | protectedProcedure | teacher 也可导入 |
| score.computeRanks | adminProcedure | 仅发布时触发 |

## 安全考虑

- 已发布的考试（status=published），`batchUpsert` 前检查状态，拒绝修改
- fullScore 从服务端 examSubjects 取，前端不可自行传入满分绕过校验

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | --- |
| 成绩表格实现 | 原生 `<table>` + controlled inputs | TanStack Table 对可编辑网格的键盘导航支持复杂，原生更可控 |
| 状态管理 | `useState(Map)` | 局部状态，不需要全局 store |
| 排名计算时机 | 发布时服务端计算 | 避免草稿阶段频繁计算，保证排名基于完整数据 |
