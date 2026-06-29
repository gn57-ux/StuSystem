---
name: project-student-performance
description: 成绩与学情分析系统项目背景、技术选型和 specs 结构
metadata:
  type: project
---

# 成绩与学情分析系统

PRD 已完成分析并切分为 6 个 feature specs（2026-06-29）。

**Why:** 面向学校教师/班主任/教务管理员的 Web 管理系统，用于成绩录入、管理和学情分析。

**How to apply:** 开发时按 specs/PLAN.md 的顺序 1→2→3→4→5→6 执行；每个 feature 有 requirements.md / design.md / tasks.md。

## 技术选型（已确认）

- 图表库：Recharts
- MVP 目标：V0.2 全功能 MVP
- 现有 todos 代码：替换清除
- 角色权限：admin / teacher 两级（MVP）
- 文件导入：CSV（Excel 非 MVP）
- PDF 报告：浏览器 `@media print` + `window.print()`

## Specs 结构

- specs/PLAN.md — 全局切分索引
- specs/1.foundation-schema/ — DB schema + Better Auth + App Shell（6 tasks）
- specs/2.data-management/ — 班级/科目/学生 CRUD + CSV 导入（7 tasks）
- specs/3.exam-score-entry/ — 考试管理 + 成绩录入表格（7 tasks）
- specs/4.analytics-dashboard/ — 统计 API + 看板 + 班级/科目分析（6 tasks）
- specs/5.student-analysis/ — 学生详情 + 趋势图 + 预警 + 备注（6 tasks）
- specs/6.reports-export/ — 报告页 + CSV 导出 + 打印样式（4 tasks）

总计：36 tasks，预估总时间约 16h
