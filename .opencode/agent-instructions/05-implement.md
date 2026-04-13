# Implement 阶段 Agent 指令 | Implement Phase Instructions

> Agent 在 implement 阶段的行为规范：按 Wave 分组并行执行任务。

---

## 输入 | Input

- `.spec/TASKS.md`（tasks 阶段细化后的版本）
- 所有 spec 文档

## 输出 | Output

- 实现代码
- spec-tracker 更新（每个任务完成后标记条款）

## 执行流程 | Execution Flow

### 1. 生成执行计划

调用 `buildExecutionPlan(tasks)` 获取按 Wave 分组的执行计划。

### 2. 按 Wave 分组执行

```
for each wave in executionPlan.waves:
    parallel dispatch all tasks in wave
    wait for all tasks to complete
    run preFlightCheck() to verify progress
    if any task failed → retry or escalate
```

### 3. 任务分发

调用 `generateDispatchCalls(executionPlan)` 生成每个任务的分发指令：
- 每个任务分发到对应 category 的 Agent
- 传递任务描述、文件路径、验收标准
- 加载指定的 skills

### 4. 任务完成后

每个任务完成后：
1. 运行任务的 QA Scenarios 验证
2. 调用 `completeTask(taskId, clauseIds)` 更新 spec-tracker
3. 标记任务为已完成

### 5. Wave 完成后

每个 Wave 完成后：
1. 调用 `preFlightCheck()` 检查整体进度
2. 检查是否有 blocking issues
3. 如果覆盖率已达标，可以提前进入 complete 阶段

## 持续验证 | Continuous Verification

| 检查点 | 工具 | 频率 |
|---|---|---|
| 任务 QA | 任务自带 QA Scenarios | 每个任务完成后 |
| 进度检查 | `preFlightCheck()` | 每个 Wave 完成后 |
| 覆盖率 | `generateCoverageReport()` | 每个 Wave 完成后 |
| 代码质量 | lint/typecheck | 每个任务完成后 |

## 错误处理 | Error Handling

- 任务失败 → 记录错误，继续其他并行任务，Wave 结束后重试
- 依赖任务失败 → 跳过依赖链上的后续任务，标记为 blocked
- 覆盖率不足 → 在最后 Wave 添加补充任务

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("implement")` 必须返回 `{ valid: true }`：
- spec-tracker 覆盖率 ≥80%

## 实施阶段操作守则 | Implementation Guardrails

- 严格按 Wave 顺序执行，不得跳过上游依赖。
- 任务执行前先读取其 Spec Refs，对照目标条款实施。
- 任务完成后立即记录 evidence，不允许事后补写。
- 如果单任务失败 3 次，停止继续扩大改动，回到 plan/tasks 阶段修正。

## 自检清单 | Self-Check Checklist

- [ ] QA Scenarios 已执行
- [ ] spec-tracker 已更新
- [ ] Wave 结束后已运行 preFlightCheck
- [ ] 未把失败任务误标为完成

## 常见错误 | Common Failure Modes

- 先写代码后补任务状态
- 并行执行存在依赖的任务
- 忽略 spec-tracker，导致覆盖率数据失真

## 引用 | References

- `task-dispatcher.ts: buildExecutionPlan()` — 生成执行计划
- `task-dispatcher.ts: generateDispatchCalls()` — 生成分发指令
- `spec-review.ts: preFlightCheck()` — 进度检查
- `spec-tracker.ts: completeTask()` — 标记任务完成
- `spec-tracker.ts: generateCoverageReport()` — 覆盖率报告
