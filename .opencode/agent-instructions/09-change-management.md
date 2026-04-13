# 规格变更管理（Spec Change Management）

> 本文档定义 spec 在执行中变更时的处理方式，避免 Agent 在旧规格和新规格之间漂移。

## 1. 何时视为规格变更

- 新增用户故事
- 修改验收标准
- 修改关键技术约束
- 删除原本承诺的功能

## 2. 变更流程

1. 先更新相关 spec 文档。
2. 再更新 spec-tracker 版本信息。
3. 重新检查受影响的 TASKS.md 条目。
4. 标记需要重跑的 QA 证据。

## 3. Agent 行为规则

- 不允许在 implement 阶段静默改需求。
- 遇到需求变更，必须显式记录到变更记录中。
- 若变更影响既有任务，优先修订任务再继续实现。

## 4. 变更记录格式

```markdown
| Date | Change | Affected Docs | Affected Tasks | Reason |
|---|---|---|---|---|
| 2026-04-13 | Add role-based access | 01, 03, 11 | Task 4, Task 7 | Security requirement updated |
```
