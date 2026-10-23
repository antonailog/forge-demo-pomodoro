# forge-demo-pomodoro 项目指引

> 索引层文件，只保留必要入口和硬约束。

## 走 Forge 体系

功能、Bug、发布类工作优先走 Forge skill；阶段不明确时先用 `/forge` 判断。
完整规则以各 skill 为唯一出处（`~/.claude/skills/forge-*/SKILL.md`）。

- 需求不清楚：`/forge-brainstorm` → 需求定义：`/forge-prd`
- 实现：`/forge-eng`（小改动用轻量模式） → 验收：`/forge-qa`
- Bug：`/forge-bugfix` → 审查发布：`/forge-review` + `/forge-ship`

## 文档治理

本项目遵循 forge-doc-policy 规范，完整白名单见
`~/.claude/skills/forge-doc-policy/doc-paths.md`。
新建 .md 前先自查白名单，不确定就停下问用户。

## 项目特化规则

（在此追加本项目特有的硬约束）
