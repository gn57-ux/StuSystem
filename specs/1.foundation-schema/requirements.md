# foundation-schema — 需求规格

## 概述

搭建成绩分析系统的数据库结构、认证体系与前端 App Shell，为后续所有功能模块提供基础设施。

## 项目信息

- 项目名: student-performance
- 架构类型: Turborepo monorepo（React + Hono/tRPC + Drizzle + PostgreSQL + Better Auth）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-29 | v1 | 初始需求 |

## 用户故事

- 作为管理员，我想要通过邮箱+密码登录，以便访问系统
- 作为任意角色用户，我想要在有侧边栏的后台布局中操作，以便快速导航各功能模块
- 作为系统，我想要区分 admin 和 teacher 两类角色，以便后续功能按角色控制访问

## 功能需求

1. [F-001] 数据库 schema — 基础实体表：User 扩展字段（role）、Class、Student、Subject
2. [F-002] 数据库 schema — 考试实体：Exam（含状态流转）、ExamSubject（每科满分配置）、Score（含成绩状态枚举）
3. [F-003] 数据库 schema — 辅助实体：TeacherNote（教师备注）、StudentAlert（预警记录）
4. [F-004] Better Auth 配置：角色字段集成、admin/teacher 两个角色、仅邮箱登录
5. [F-005] tRPC 上下文（context）：注入 db、session、user（含 role）
6. [F-006] tRPC 保护过程：`protectedProcedure`（需登录）+ `adminProcedure`（需 admin 角色）
7. [F-007] 前端 App Shell：左侧固定导航、顶部全局筛选区（班级、考试）、内容区 outlet
8. [F-008] 前端路由守卫：未登录跳转 /login，登录后跳转 / 工作台

## 非功能需求

- 性能：schema 中为外键列和常用查询列添加索引
- 安全：密码由 Better Auth 处理，不在 tRPC response 中返回 passwordHash；role 字段由服务端写入，前端不可自行设置
- 兼容性：桌面端现代浏览器

## 验收标准

- [ ] [AC-001] `pnpm db:generate` 和 `pnpm db:migrate` 成功运行，所有表在数据库中存在
- [ ] [AC-002] 访问任意受保护路由未登录时自动跳转 /login
- [ ] [AC-003] 邮箱密码登录成功后跳转到工作台，侧边栏可见
- [ ] [AC-004] `protectedProcedure` 在无 session 时返回 UNAUTHORIZED error
- [ ] [AC-005] `adminProcedure` 在 teacher 角色时返回 FORBIDDEN error
- [ ] [AC-006] 侧边栏包含所有一级导航入口（工作台、学生管理、考试管理、学情分析、报告中心）

## 依赖

- `drizzle-orm` + `drizzle-kit`（已在 packages/db）
- `better-auth`（已在 packages/auth 和 catalog）
- `@tanstack/react-router`（已在 apps/web）

## 开放问题

- 超级管理员是否需要在 MVP 中实现？→ 暂定 MVP 只有 admin / teacher 两级
- 学期（semester）是否作为独立实体管理？→ MVP 暂用 Exam 的 date 字段推断，不单独建表
