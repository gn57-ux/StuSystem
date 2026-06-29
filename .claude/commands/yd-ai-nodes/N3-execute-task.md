# N3: 执行 Task

## 开始标记

```text
🔨 Task {T-编号}: {任务描述} ~{预估时间}
   Feature {F}/{总F} | 任务 {N}/{总数}
```

## Skill 匹配

根据任务涉及的工种匹配：

| 工种 | 串行（主流程 inline 调用 skill） | 并行（N2 派发 subagent，`subagent_type`） |
| ---- | -------------------------------- | ----------------------------------------- |
| 前端 | skill `yd-frontend-engineer` | `yd-frontend-engineer` |
| 后端 | skill `yd-backend-engineer` | `yd-backend-engineer` |
| 数据库 | skill `yd-database-engineer` | `yd-database-engineer` |
| 合约 | skill `yd-contract-engineer` | （暂无 subagent，串行执行） |
| QA/测试 | skill `yd-qa-engineer` | `yd-qa-engineer`（一般在 N6 派发） |
| 没有匹配 | AI 直接执行 | — |

- **串行执行**：在当前会话直接调用对应 `yd-*` skill（上下文连贯，最稳）。
- **并行执行**：由 N2 用 Agent 工具派发对应 `subagent_type` 的角色化 subagent；subagent 内部会自行加载同名 skill。
- 合约、安全（`yd-security`）、代码审查（`yd-code-reviewer`）、文档同步（`yd-doc-syncer`）按设计保持 skill 串行调用，不做成并行 subagent。

## 开发

- 参考 design.md 技术设计和 `.claude/rules/` 规范
- 技术选型自行选最优解，不暂停
- 业务逻辑/产品方向问题 → 暂停与用户沟通
