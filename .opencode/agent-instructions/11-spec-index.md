# Spec 文档索引（Spec Document Index）

> 本文档定义 `.spec/` 运行时目录中的主文档入口，帮助 Agent 和人类都能快速找到当前阶段的关键信息。

## 1. 核心入口

| 文件 | 作用 |
|---|---|
| `SPEC.md` | 主规格总入口，含宪章与高层要求 |
| `TASKS.md` | 当前可执行任务清单 |
| `.workflow-state.json` | 当前阶段状态 |
| `.spec-tracker.json` | 条款覆盖与追踪数据 |

## 2. 建议阅读顺序

1. 先读 `SPEC.md`
2. 再读相关分模板文档
3. 再读 `TASKS.md`
4. 最后读 tracker / evidence

## 3. Agent 规则

- 不允许只读单个模板就开始实现。
- 实现前至少要读：主需求、技术架构、任务清单。
- 审查前必须读 tracker 与 review 输出。
