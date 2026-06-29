# 开发计划索引

## 本次 PRD（2026-06-29）切分为 6 个 feature

| 序号 | feature | 说明 | 依赖 | 状态 |
| ---- | ------- | ---- | ---- | ---- |
| 1 | foundation-schema | DB schema 设计、Better Auth 角色、tRPC 保护过程、前端 App Shell | — | 待开发 |
| 2 | data-management | 班级/科目/学生 CRUD、CSV 批量导入 | 1 | 待开发 |
| 3 | exam-score-entry | 考试 CRUD、成绩录入表格、草稿/提交、CSV 导入 | 2 | 待开发 |
| 4 | analytics-dashboard | 统计计算 API、数据看板、班级/科目分析、重点关注学生 | 3 | 待开发 |
| 5 | student-analysis | 学生详情页、趋势图/雷达图、预警计算、教师备注 | 4 | 待开发 |
| 6 | reports-export | 班级/学生报告页、成绩 CSV 导出 | 5 | 待开发 |

**推荐执行顺序**：1 → 2 → 3 → 4 → 5 → 6（串行，后序依赖前序数据结构）

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**，跨 feature 用 `{序号}.` 前缀区分
- 例：`2.T-001` = 序号 2 这个 feature 的 T-001；`3.F-005` = 序号 3 的 F-005
- **跨 feature 依赖**写全限定 ID，如 `3.T-001 依赖 2.T-004`

## 技术决策（全局）

| 决策 | 选型 |
| ---- | ---- |
| 图表库 | Recharts |
| MVP 版本目标 | V0.2 全功能 MVP |
| 现有 todos 代码 | 替换清除 |
| 角色权限 | MVP 先实现 admin / teacher 两类 |
| 文件导入 | CSV（MVP），Excel 后续 |
| PDF 报告 | 浏览器打印样式（@media print）实现 |
