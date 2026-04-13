# 阶段质量门控（Phase Quality Gates）

> 本文档定义 constitution / specify / plan / tasks / implement / complete 六个阶段的统一放行标准。Agent 不得凭主观判断跳过门控。

## 1. 总规则

1. 当前阶段未通过，不得进入下一阶段。
2. 门控失败必须返回“缺什么、为什么缺、怎么补”。
3. 所有门控都应优先用可执行检查验证，而非人工判断。

## 2. 各阶段门槛

| 阶段 | 最低要求 | 失败时动作 |
|---|---|---|
| constitution | SPEC.md 含 Vision / Values / Constraints | 回补宪章章节 |
| specify | 至少 3 个故事或条款已注册 | 回补需求与验收标准 |
| plan | TASKS.md 已生成且至少 1 个任务 | 回补任务计划 |
| tasks | 每任务有 AC + Spec Refs + Files | 继续细化任务 |
| implement | 覆盖率达到阈值，关键任务已完成 | 回到任务执行 |
| complete | spec-review 无 blocking issues | 回到实现或修订文档 |

## 3. 门控输出格式

```markdown
Gate: tasks
Result: FAIL
Reasons:
- Task 3 missing Acceptance Criteria
- Task 5 missing Spec Refs
Next Action:
- Refine Task 3 and Task 5 before nextPhase()
```

## 4. 强制阻断场景

- 缺少根文档（SPEC.md / TASKS.md）
- 关键模板为空章节
- 任务没有验收标准
- spec-review 结果为 REJECT
