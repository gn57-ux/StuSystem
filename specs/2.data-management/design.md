# data-management — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/api（tRPC routers）、apps/web/src/routes/（页面）、apps/web/src/components/（表格/模态框）

## 功能模块设计

### 模块 1: 班级 & 科目管理（packages/api/src/routers/class.ts + subject.ts）

**tRPC Procedures:**

```ts
// class router
classRouter.list()           → Class[]
classRouter.create(name, grade)
classRouter.update(id, name, grade)
classRouter.delete(id)       → 检查 students count，有学生则抛 CONFLICT

// subject router
subjectRouter.list()         → Subject[]
subjectRouter.create(name)
subjectRouter.update(id, name)
subjectRouter.delete(id)     → 检查 examSubjects count，有关联则抛 CONFLICT
```

**前端页面（apps/web/src/routes/_auth/settings.tsx 或 独立路由）:**

- 班级管理和科目管理可放在「系统设置」路由下（侧边栏入口）
- 每个实体：shadcn `<Table>` 展示 + 右上角「新增」按钮 → `<Dialog>` 内 `<Form>`（TanStack Form + Zod）

### 模块 2: 学生管理（packages/api/src/routers/student.ts）

**tRPC Procedures:**

```ts
studentRouter.list({ classId?, search?, page, pageSize })
  → { data: Student[], total: number }

studentRouter.getById(id) → Student

studentRouter.create({ studentNo, name, gender, classId, enrollYear, status, contact })
  → 唯一性检查：同 classId + studentNo

studentRouter.update(id, partial<Student>)

studentRouter.updateStatus(id, status)  // active/leave/transfer

studentRouter.bulkImport(rows: StudentRow[])
  → { success: number, errors: { row: number, reason: string }[] }
```

**Zod Schema:**

```ts
const StudentCreateSchema = z.object({
  studentNo: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  gender: z.enum(['male', 'female', 'unset']).optional(),
  classId: z.number().int().positive(),
  enrollYear: z.number().int().min(2000).max(2100).optional(),
  status: z.enum(['active', 'leave', 'transfer']).default('active'),
  contact: z.string().max(100).optional(),
});
```

**前端页面（apps/web/src/routes/_auth/students/index.tsx）:**

- 顶部：班级 `<Select>` 筛选 + `<Input>` 搜索框（controlled, debounced 300ms）
- `<Table>`（TanStack Table）：列 = 姓名、学号、班级、性别、状态 + 操作列
- 分页：shadcn `<Pagination>` 组件，pageSize=20
- 新增/编辑：`<Dialog>` + TanStack Form
- CSV 导入：单独的 `<Button>` 触发 `<ImportDialog>`

### 模块 3: CSV 批量导入（apps/web/src/components/student-import-dialog.tsx）

**CSV 格式约定（第一行为表头）:**

```
学号,姓名,班级名称,性别,入学年份,联系方式
```

**导入流程:**

1. 用户选择文件 → 前端 `FileReader` + `papaparse`（或手动 split）解析 CSV
2. 预览表格展示解析结果，错误行（缺必填、学号已存在）标红
3. 用户确认 → 调用 `studentRouter.bulkImport()`
4. 显示结果：成功 N 条，失败 M 条（附错误详情）

**后端 bulkImport:**

- 事务内逐条 `insert on conflict do nothing` 或先检查再批量插入
- 匹配班级：按 `name` 查 Class，找不到返回该行错误

## 接口契约

所有写操作需 `adminProcedure`；读操作（list/getById）用 `protectedProcedure`（teacher 也可查看）。

## 安全考虑

- 学号唯一性约束在数据库层（unique index on class_id + student_no）和应用层双重校验
- bulkImport 在事务中执行，部分失败不影响已成功的行（非原子，逐行处理并收集错误）

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| CSV 解析 | 原生 split（MVP）| 无需引入 papaparse，CSV 格式简单可控 |
| 分页 | cursor-based offset | 学生数量通常 <1000，offset 够用 |
| 班级/科目管理入口 | 侧边栏「系统设置」独立路由 | 与学生/考试管理分离，权限更清晰 |
