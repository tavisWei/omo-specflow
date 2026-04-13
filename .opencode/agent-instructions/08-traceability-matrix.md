# 追踪矩阵规范（Traceability Matrix Specification）

> 本文档定义需求、任务、验证证据之间的双向追踪规则，确保多 Agent 执行后仍能回溯“为什么做、做到哪、怎么证明”。

## 1. 追踪链路

```text
User Input
  -> Constitution
  -> User Stories / Acceptance Criteria
  -> Tasks
  -> Implementation
  -> QA Evidence
  -> Coverage Report
```

## 2. 矩阵字段

| 字段 | 说明 |
|---|---|
| Clause ID | US-xxx / AC-xxx / FR-xxx |
| Covered By Task | 由哪些任务实现 |
| Evidence Path | 对应证据文件 |
| Status | pending / done / blocked |
| Notes | 异常说明 |

## 3. 最低要求

1. 每个 P0 条款必须映射到至少 1 个任务。
2. 每个已完成任务必须至少有 1 个 evidence 文件。
3. 每个 blocking issue 必须能定位到对应条款或任务。

## 4. 输出建议

```markdown
| Clause | Task | Evidence | Status |
|---|---|---|---|
| US-001 | Task 2, Task 3 | .sisyphus/evidence/auth-flow.txt | done |
| AC-003 | Task 5 | .sisyphus/evidence/list-pagination.txt | done |
```
