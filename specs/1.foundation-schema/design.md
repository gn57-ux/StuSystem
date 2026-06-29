# foundation-schema — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始设计 |

## 项目架构

- 架构类型: Turborepo monorepo
- 涉及层: packages/db（schema）、packages/auth（Better Auth）、packages/api（tRPC context/procedures）、apps/web（路由/布局）

## 数据模型

### 完整 Schema（packages/db/src/schema/）

```ts
// classes.ts
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  grade: varchar('grade', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// students.ts
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentNo: varchar('student_no', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  gender: varchar('gender', { length: 10 }),  // male/female/unset
  classId: integer('class_id').references(() => classes.id).notNull(),
  enrollYear: integer('enroll_year'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active/leave/transfer
  contact: varchar('contact', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// subjects.ts
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// exams.ts
export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // weekly/monthly/midterm/final/mock
  examDate: date('exam_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft/entry/published
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// exam_classes.ts (Exam N-N Class)
export const examClasses = pgTable('exam_classes', {
  examId: integer('exam_id').references(() => exams.id).notNull(),
  classId: integer('class_id').references(() => classes.id).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.examId, t.classId] }) }));

// exam_subjects.ts (Exam N-N Subject, with fullScore)
export const examSubjects = pgTable('exam_subjects', {
  examId: integer('exam_id').references(() => exams.id).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  fullScore: integer('full_score').notNull().default(100),
}, (t) => ({ pk: primaryKey({ columns: [t.examId, t.subjectId] }) }));

// scores.ts
export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  examId: integer('exam_id').references(() => exams.id).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  score: numeric('score', { precision: 6, scale: 2 }),
  fullScore: integer('full_score').notNull().default(100),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // normal/absent/exempt/pending
  rankInClass: integer('rank_in_class'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.studentId, t.examId, t.subjectId),
}));

// teacher_notes.ts
export const teacherNotes = pgTable('teacher_notes', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  authorId: text('author_id').notNull(), // Better Auth user id
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// student_alerts.ts
export const studentAlerts = pgTable('student_alerts', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  examId: integer('exam_id').references(() => exams.id).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  // decline/subject_weak/low_score/volatile/biased
  severity: varchar('severity', { length: 20 }).notNull().default('warning'),
  status: varchar('status', { length: 20 }).notNull().default('open'), // open/confirmed/ignored
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Better Auth 用户角色扩展（packages/auth/src/index.ts）

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'teacher', required: false },
    },
  },
});
```

### tRPC Context（packages/api/src/context.ts）

```ts
export async function createContext({ context }: { context: HonoContext }) {
  const session = await auth.api.getSession({ headers: context.req.raw.headers });
  return { db, session, user: session?.user ?? null };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### tRPC Procedures（packages/api/src/trpc.ts）

```ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

## 前端设计

### 路由结构（apps/web/src/routes/）

```
routes/
├── __root.tsx          ← 全局 provider (QueryClient, tRPC, theme)
├── _auth/              ← 需登录的布局路由（含 App Shell）
│   ├── _auth.tsx       ← 检查 session，未登录 redirect /login
│   ├── index.tsx       ← 工作台（dashboard）
│   ├── students/
│   ├── exams/
│   ├── analytics/
│   └── reports/
└── login.tsx           ← 登录页（保留现有逻辑，替换 todos 相关）
```

### App Shell 布局（_auth.tsx）

- 左侧固定侧边栏，宽 240px，含 logo + 导航菜单 + 用户头像/退出
- 顶部工具栏：全局班级筛选 `<Select>`（下拉）+ 考试筛选（来自 TanStack Query）
- 内容区 `<Outlet />`，`overflow-auto`

### 全局筛选状态

用 TanStack Router search params（`/analytics?classId=1&examId=2`）传递，避免 Context 层级问题。

## 安全考虑

- Better Auth session cookie 由框架管理，httpOnly
- `role` 字段只能由 admin 通过专用 API 写入，不在用户自身更新接口中暴露
- tRPC 序列化时排除 `passwordHash` 等 Better Auth 内部字段

## 技术决策

| 决策 | 选型 | 理由 |
| ---- | ---- | ---- |
| 用户角色存储 | Better Auth additionalFields | 不单独建 roles 表，MVP 复杂度低 |
| 学期 | 不建独立表 | 用 exam.examDate 按年月推断，MVP 足够 |
| 全局筛选状态 | URL search params | 可分享 URL、刷新保持状态 |
