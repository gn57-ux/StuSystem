# 成绩与学情分析系统用户手册

版本：1.0  
日期：2026-06-29  
访问地址：http://54.253.49.212

## 1. 系统介绍

成绩与学情分析系统用于学校或班级场景下的学生成绩管理、考试管理、班级学情分析与报告生成。系统支持管理员维护基础数据，录入和导入成绩，并基于考试、班级、学生维度生成统计分析。

系统当前已部署在 AWS 云服务器上，前端通过 Nginx 提供静态页面，后端通过 PM2 常驻运行，数据存储在 AWS RDS PostgreSQL 数据库中。

## 2. 登录账号

管理员账号：

```text
账号：admin@student-performance.local
密码：Admin@2026!
```

测试教师账号：

```text
账号：16666666666@163.com
角色：teacher
```

说明：

- 管理员角色为 `admin`，可执行学生、班级、科目、考试、成绩等管理操作。
- 普通教师角色为 `teacher`，主要用于查看和分析数据。
- 当前系统通过邮箱和密码登录。

## 3. 初始演示数据

系统已导入一组初始展示数据，便于首次进入后查看效果：

- 班级：高一（1）班、高一（2）班
- 科目：语文、数学、英语、物理、化学
- 考试：2026 春季期中考试、2026 春季期末考试
- 学生：48 名
- 成绩：480 条
- 学情预警：12 条
- 教师备注：4 条

推荐首次查看路径：

1. 登录管理员账号。
2. 进入“工作台”或“学情分析”。
3. 选择考试：`2026 春季期末考试`。
4. 选择班级：`高一（1）班` 或 `高一（2）班`。
5. 查看班级均分、分数分布、科目均分、排名变化和预警信息。

## 4. 功能说明

### 4.1 工作台

工作台用于查看当前系统的核心概览，包括班级、考试、学生和成绩相关摘要。进入系统后可先从工作台确认数据是否已经录入。

### 4.2 学生管理

学生管理用于维护学生基础信息。

常见操作：

- 新增学生
- 编辑学生信息
- 查看学生详情
- 批量导入学生
- 按班级查看学生列表

学生信息通常包括：

- 学号
- 姓名
- 性别
- 所属班级
- 入学年份
- 状态
- 联系方式

### 4.3 考试管理

考试管理用于创建考试、维护考试关联班级和科目，并录入成绩。

常见操作：

- 创建考试
- 设置考试科目
- 关联参加考试的班级
- 录入或导入成绩
- 发布考试

注意：

- 考试发布后会被纳入数据分析。
- 已发布考试会出现在看板和学情分析页面的筛选器中。

### 4.4 学情分析

学情分析用于查看班级或科目维度的数据表现。

班级分析通常包含：

- 班级均分
- 及格率
- 优秀率
- 最高分与最低分
- 中位数
- 标准差
- 分数段分布
- 各科平均分
- 与上一场考试对比
- 排名进退步学生

使用方式：

1. 进入“学情分析”。
2. 选择考试。
3. 选择班级。
4. 页面会自动加载统计图表和分析数据。

### 4.5 报告中心

报告中心用于生成班级或学生维度的报告。

可查看内容包括：

- 班级整体表现
- 学生个人成绩
- 科目优势与薄弱项
- 学情预警
- 教师备注

### 4.6 系统设置

系统设置用于维护基础配置。

当前包含：

- 班级管理
- 科目管理

管理员可在这里维护后续考试和学生录入所需的基础字典。

## 5. 开发工作流总结

本项目由 Claude 工作流辅助生成和迭代，采用“需求拆解 → 数据建模 → 后端 API → 前端页面 → 数据分析 → 部署验证”的方式完成。整体目标不是只生成页面，而是覆盖数据库、认证、权限、接口、前端交互、图表分析、部署运维的完整链路。

### 5.1 技术选型概览

项目基于 Better-T-Stack 风格的全栈 TypeScript monorepo。

| 层级 | 技术 | 用途 |
|---|---|---|
| Monorepo | pnpm workspace | 管理 `apps/*` 和 `packages/*` 多包项目 |
| 前端 | React 19 | 构建浏览器端交互界面 |
| 前端构建 | Vite | 本地开发和生产静态资源构建 |
| 路由 | TanStack Router | 文件路由、登录保护、页面跳转、离开页面拦截 |
| 数据请求 | TanStack Query | 缓存接口数据、管理 loading/error 状态 |
| API 通信 | tRPC | 前后端共享类型的 RPC 调用 |
| UI | shadcn/ui 风格组件 | 表单、按钮、卡片、弹窗、表格等基础组件 |
| 图表 | Recharts | 分数分布、科目均分、趋势图、雷达图 |
| 后端 | Hono + Node.js | HTTP 服务、认证路由、tRPC 路由挂载 |
| 数据库 | PostgreSQL | 业务数据持久化 |
| ORM | Drizzle ORM | 数据表定义、类型安全查询、迁移 |
| 认证 | Better Auth | 邮箱密码登录、Session、Cookie、用户表 |
| 校验 | Zod | API 输入和环境变量校验 |
| 代码质量 | TypeScript strict + Biome/Ultracite | 类型检查、格式和 lint |

### 5.2 Feature 1：数据库 Schema 与项目骨架

第一阶段完成系统的数据模型和全栈骨架。

核心产出：

- 创建数据库表结构。
- 搭建 Drizzle ORM schema。
- 搭建 Better Auth 认证。
- 搭建 tRPC 路由结构。
- 实现 `protectedProcedure` 和 `adminProcedure`。

主要数据表：

| 表 | 说明 |
|---|---|
| `user` | Better Auth 用户表，包含 `role` 字段，用于区分 `admin` 和 `teacher` |
| `session` | 登录会话表 |
| `account` | 登录账号表，保存邮箱密码认证信息 |
| `verification` | Better Auth 验证信息表 |
| `classes` | 班级 |
| `subjects` | 科目 |
| `students` | 学生，关联班级 |
| `exams` | 考试，包含 `draft` 和 `published` 状态 |
| `exam_classes` | 考试和班级的多对多关系 |
| `exam_subjects` | 考试和科目的多对多关系，并保存满分配置 |
| `scores` | 成绩记录，对应学生、考试、科目 |
| `student_alerts` | 学情预警 |
| `teacher_notes` | 教师备注 |
| `exam_class_comments` | 班级考试教师评语 |

权限设计：

- `protectedProcedure`：要求用户已登录，适合查看和普通操作。
- `adminProcedure`：要求用户角色为 `admin`，适合新增、编辑、删除、发布等管理操作。

### 5.3 Feature 2：基础数据管理

基础数据管理用于维护系统运行所需的班级、科目、学生和考试信息。

后端 tRPC routers：

| Router | 作用 |
|---|---|
| `class` | 班级 CRUD |
| `subject` | 科目 CRUD |
| `student` | 学生分页列表、新建、编辑、删除、CSV 批量导入 |
| `exam` | 考试创建、编辑、发布、关联班级、关联科目 |

前端页面：

| 页面 | 作用 |
|---|---|
| `/students` | 学生列表，支持搜索、分页、状态筛选 |
| `/exams` | 考试列表和考试管理入口 |
| `/settings/classes` | 班级和科目管理 |

CSV 导入能力：

- 支持 UTF-8 BOM。
- 支持字段校验。
- 支持错误提示。
- 适合一次性导入大量学生或成绩数据。

### 5.4 Feature 3：成绩录入

成绩录入模块用于把每场考试的每名学生、每个科目的成绩写入系统。

后端能力：

- `score router` 提供成绩查询和批量 upsert。
- 支持考试从 `draft` 发布为 `published`。
- 发布考试时自动触发预警计算。

前端能力：

- 成绩录入表格。
- 支持键盘导航，使用 `Tab` 或 `Enter` 在单元格间移动。
- 支持防抖自动保存，减少频繁请求。
- 离开页面前如有未保存内容，会进行拦截提醒。
- 发布考试前有二次确认弹窗。

技术细节：

- 批量保存使用 upsert，避免重复成绩记录。
- `scores` 表通过学生、考试、科目建立唯一约束。
- 成绩记录包含 `score`、`fullScore`、`status`、`rankInClass` 等字段。

### 5.5 Feature 4：学情分析看板

学情分析模块用于把成绩数据转换成可阅读的班级表现和学科表现。

后端 `analytics router` 提供：

- 班级总分分布。
- 分数段分桶。
- 科目均分对比。
- 与上一场考试对比。
- 排名进退步分析。
- 学情预警列表。

预警类型：

| 类型 | 含义 |
|---|---|
| `total_low` | 总分低位，通常表示总分处于班级后段 |
| `subject_weak` | 单科薄弱，表示某科明显低于班级平均 |
| `rank_declined` | 排名退步，表示相较上一场考试名次明显下降 |

前端图表组件：

| 组件 | 作用 |
|---|---|
| `ScoreDistributionBar` | 分数段分布柱状图 |
| `SubjectAvgBar` | 科目均分对比柱状图 |
| `ClassRankPie` | 排名分段饼图 |

前端页面：

| 页面 | 作用 |
|---|---|
| `/analytics/class` | 班级学情分析，选择考试和班级后展示图表 |
| `/analytics/subject` | 科目分析，查看单科历次考试均分趋势 |

### 5.6 Feature 5：学生详情分析

学生详情页用于从单个学生视角查看成绩、趋势、偏科和教师备注。

后端 procedures：

| Procedure | 作用 |
|---|---|
| `student.getScoreHistory` | 历次考试总分和排名趋势 |
| `student.getSubjectHistory` | 单科跨考试历史折线 |
| `student.getLatestSubjectScores` | 最新考试各科成绩、班级均分、偏科分析 |
| `analytics.studentAlerts` | 学生当前预警列表 |
| `analytics.resolveAlert` | 处理预警，确认或忽略 |
| `note.list` | 查询教师备注 |
| `note.create` | 新增教师备注 |

前端图表组件：

| 组件 | 作用 |
|---|---|
| `TrendLine` | 总分和排名趋势折线图 |
| `SubjectRadar` | 科目能力雷达图 |

前端页面：

| 页面 | 作用 |
|---|---|
| `/students/$studentId` | 学生详情页 |

学生详情页内容：

- 基本信息。
- 本次成绩总览。
- 排名变化，用颜色标注上升或下降。
- 历史趋势图。
- 单科历史折线图。
- 科目雷达图。
- 预警列表，可确认或忽略。
- 教师备注，新增后乐观更新，界面会先显示再等待服务器确认。

### 5.7 Feature 6：报告与导出

报告模块用于把分析结果整理成班级报告或学生报告，便于打印、归档或与家长沟通。

后端 procedures：

| Procedure | 作用 |
|---|---|
| `report.classReport` | 聚合班级报告数据，包括均分、最高分、最低分、科目均分、预警和评语 |
| `report.studentReport` | 聚合学生报告数据，包括基础信息、成绩、预警和近期备注 |
| `report.saveComment` | 保存班级考试教师评语，同一考试和班级保留一条 |
| `report.exportScores` | 导出成绩数据 |

前端页面：

| 页面 | 作用 |
|---|---|
| `/reports/class` | 班级成绩报告 |
| `/reports/student` | 学生成绩报告 |

前端能力：

- 班级报告包含指标卡、科目均分图、预警表、教师评语。
- 教师评语支持 `onBlur` 自动保存。
- 学生报告包含基础信息、成绩表、趋势图、雷达图、预警摘要和近期备注。
- `export-csv.ts` 提供 CSV 导出能力。

CSV 导出细节：

- 使用 UTF-8 BOM，兼容 Excel 中文打开。
- 对逗号、换行、引号做单元格转义。
- 适合导出成绩明细给教务或班主任。

打印样式：

- `index.css` 中包含 `@media print`。
- 打印时隐藏侧边栏和操作按钮，让报告更适合纸质输出或 PDF 保存。

### 5.8 全局质量保障

项目开发过程中使用了以下质量约束：

- TypeScript 严格模式。
- `noUncheckedIndexedAccess` 等严格类型配置。
- Biome / Ultracite lint。
- 所有 API 输入使用 Zod 校验。
- 所有写操作要求登录。
- 管理操作要求 `admin` 角色。
- 密钥和数据库 URL 通过 `packages/env` 进行 Zod 校验。
- 敏感配置不硬编码在源码中，通过 `.env` 注入。

整体覆盖范围：

```text
数据库 Schema
  -> Drizzle ORM
  -> 后端 tRPC API
  -> Better Auth 认证与权限
  -> React 前端页面
  -> 图表分析
  -> 报告导出
  -> AWS 部署和运维
```

本项目累计约 40 个文件创建或修改，覆盖从数据库到前端页面的完整业务链路。

## 6. 技术架构

### 6.1 总体架构

系统采用前后端分离架构：

```text
浏览器
  |
  | HTTP
  v
Nginx
  |-- 静态文件：React/Vite 前端
  |
  |-- /trpc/       -> Node.js 后端
  |-- /api/auth/   -> Node.js 后端
                       |
                       v
                 AWS RDS PostgreSQL
```

### 6.2 前端

前端位置：

```text
apps/web
```

主要技术：

- React
- Vite
- TanStack Router
- TanStack Query
- tRPC Client
- Tailwind CSS
- shadcn/ui 风格组件

生产构建产物：

```text
apps/web/dist/
```

线上静态文件发布目录：

```text
/var/www/student-performance
```

### 6.3 后端

后端位置：

```text
apps/server
```

主要技术：

- Node.js
- Hono
- tRPC Server
- Better Auth
- Drizzle ORM
- PostgreSQL Driver

后端监听端口：

```text
3000
```

生产构建产物：

```text
apps/server/dist/index.mjs
```

PM2 服务名：

```text
student-perf-server
```

### 6.4 数据库

数据库使用 AWS RDS PostgreSQL。

当前数据库信息：

```text
数据库：postgres
主用户：postgres
端口：5432
RDS Endpoint：stu-database-1.ctcomqyi2eyo.ap-southeast-2.rds.amazonaws.com
区域：ap-southeast-2
```

主要数据表：

- `user`
- `session`
- `account`
- `verification`
- `classes`
- `subjects`
- `students`
- `exams`
- `exam_classes`
- `exam_subjects`
- `scores`
- `student_alerts`
- `teacher_notes`

## 7. 部署方式

### 7.1 云资源

当前部署使用：

- EC2：运行前端静态服务、Node.js 后端、Nginx、PM2
- RDS PostgreSQL：存储业务数据
- Nginx：前端静态文件服务和 API 反向代理
- PM2：Node.js 后端进程守护和开机自启

当前 EC2 公网访问地址：

```text
http://54.253.49.212
```

### 7.2 EC2 环境

已安装组件：

```text
Node.js v20.20.2
pnpm 9.15.9
PM2 7.0.1
Nginx 1.28.3
git 2.53.0
```

项目目录：

```text
/home/ubuntu/student-performance
```

前端发布目录：

```text
/var/www/student-performance
```

### 7.3 环境变量

后端环境变量文件：

```text
/home/ubuntu/student-performance/apps/server/.env
```

主要内容：

```env
BETTER_AUTH_SECRET=<随机密钥>
BETTER_AUTH_URL=http://54.253.49.212
CORS_ORIGIN=http://54.253.49.212
DATABASE_URL=postgresql://postgres:<RDS密码>@stu-database-1.ctcomqyi2eyo.ap-southeast-2.rds.amazonaws.com:5432/postgres?sslmode=no-verify
NODE_ENV=production
```

前端环境变量文件：

```text
/home/ubuntu/student-performance/apps/web/.env
```

主要内容：

```env
VITE_SERVER_URL=http://54.253.49.212
```

说明：

- 当前使用 HTTP 访问，因此 Better Auth cookie 配置会使用非 `secure` cookie。
- 如果未来切换 HTTPS，需要把 `BETTER_AUTH_URL`、`CORS_ORIGIN`、`VITE_SERVER_URL` 改为 HTTPS 地址，并重新构建前后端。

### 7.4 Nginx 配置

Nginx 配置文件：

```text
/etc/nginx/sites-available/student-perf
```

启用位置：

```text
/etc/nginx/sites-enabled/student-perf
```

核心配置：

```nginx
server {
    listen 80;
    server_name 54.253.49.212;

    root /var/www/student-performance;
    index index.html;

    location /trpc/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 8. 常用运维命令

### 8.1 SSH 登录 EC2

```bash
ssh -i /Users/ruolan/Downloads/stu-rsa.pem ubuntu@54.253.49.212
```

### 8.2 查看后端状态

```bash
pm2 status
```

### 8.3 查看后端日志

```bash
pm2 logs student-perf-server
```

### 8.4 重启后端

```bash
pm2 restart student-perf-server
```

### 8.5 验证后端

```bash
curl http://localhost:3000
```

正常返回：

```text
OK
```

### 8.6 验证 Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

### 8.7 重载 Nginx

```bash
sudo systemctl reload nginx
```

## 9. 更新代码流程

如果后续代码有更新，可按以下流程部署。

进入项目目录：

```bash
cd /home/ubuntu/student-performance
```

安装依赖：

```bash
pnpm install --frozen-lockfile
```

执行数据库迁移：

```bash
pnpm db:migrate
```

构建后端：

```bash
pnpm --filter server build
```

构建前端：

```bash
pnpm --filter web build
```

发布前端静态文件：

```bash
sudo rm -rf /var/www/student-performance
sudo mkdir -p /var/www/student-performance
sudo cp -a apps/web/dist/. /var/www/student-performance/
sudo chown -R www-data:www-data /var/www/student-performance
```

重启后端：

```bash
pm2 restart student-perf-server
pm2 save
```

重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. 停止和重新启动云服务

如果需要节省费用，可以停止 EC2 和 RDS。重新启动时建议按以下顺序：

1. 启动 RDS 数据库。
2. 等 RDS 状态变为 `可用`。
3. 启动 EC2。
4. 等 EC2 状态变为 `running`，并通过状态检查。
5. 访问系统地址。

注意：

- 如果没有绑定 Elastic IP，EC2 停止后再启动，公网 IP 可能变化。
- 如果公网 IP 变化，需要同步修改后端和前端环境变量。

需要修改的位置：

```text
/home/ubuntu/student-performance/apps/server/.env
/home/ubuntu/student-performance/apps/web/.env
/etc/nginx/sites-available/student-perf
```

修改后重新构建和重启：

```bash
cd /home/ubuntu/student-performance
pnpm --filter web build
pnpm --filter server build

sudo rm -rf /var/www/student-performance
sudo mkdir -p /var/www/student-performance
sudo cp -a apps/web/dist/. /var/www/student-performance/
sudo chown -R www-data:www-data /var/www/student-performance

pm2 restart student-perf-server
sudo nginx -t
sudo systemctl reload nginx
```

建议：

- 给 EC2 绑定 Elastic IP，避免公网 IP 改变。
- 如果有正式域名，建议配置 HTTPS。

## 11. 已处理的问题记录

### 11.1 HTTP 下登录成功但不跳转

原因：

Better Auth 原先强制设置 `secure: true`，但当前系统使用 HTTP 访问，浏览器不会保存 Secure Cookie。

修复方式：

```ts
const isHttps = env.BETTER_AUTH_URL.startsWith("https://");

defaultCookieAttributes: {
  sameSite: isHttps ? "none" : "lax",
  secure: isHttps,
  httpOnly: true,
}
```

### 11.2 学情分析 SQL 报错

原因：

后端在查询上一场考试时，把考试 ID 当成考试日期和 `exam_date` 比较。

修复方式：

查询当前考试时同时取出 `examDate`，并使用真实考试日期比较：

```ts
lt(exams.examDate, exam.examDate)
```

### 11.3 RDS SSL 连接问题

RDS 要求 SSL 连接，当前数据库连接串使用：

```text
sslmode=no-verify
```

这表示连接加密，但不校验证书链。生产环境更严谨的做法是安装 AWS RDS CA 证书，并使用证书校验模式。

## 12. 安全建议

当前系统已可用于演示和初步使用。若用于正式生产，建议完成以下增强：

1. 绑定正式域名。
2. 配置 HTTPS 证书。
3. 修改默认管理员密码。
4. 使用 Elastic IP 或域名避免公网 IP 变化。
5. 为 RDS 开启自动备份。
6. 配置 RDS CA 证书校验。
7. 限制 EC2 安全组入站规则，只开放必要端口。
8. 定期导出或备份数据库。
9. 不要在公开文档中长期保留管理员密码。

## 13. 快速验收清单

| 检查项 | 命令或操作 | 期望结果 |
|---|---|---|
| 网站访问 | 打开 `http://54.253.49.212` | 显示登录页 |
| 管理员登录 | 使用管理员账号密码登录 | 进入系统 |
| 后端健康检查 | `curl http://localhost:3000` | 返回 `OK` |
| PM2 状态 | `pm2 status` | `student-perf-server` 为 `online` |
| Nginx 配置 | `sudo nginx -t` | syntax is ok |
| 数据展示 | 选择期末考试和高一班级 | 图表正常显示 |
| 数据库连接 | 查看 PM2 日志 | 无数据库连接错误 |
