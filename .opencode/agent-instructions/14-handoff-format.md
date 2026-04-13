# 交接格式（Handoff Format）

> 定义会话中断、阶段切换、或多 Agent 接力时的上下文交接格式。

## 1. 必填信息

- 当前阶段
- 已完成任务
- 未完成任务
- 阻塞项
- 关键文档路径
- 下一步建议

## 2. 标准格式

```markdown
## Handoff
Current Phase:
Completed:
Pending:
Blocked By:
Key Docs:
Next Recommended Action:
```

## 3. 使用规则

- 跨阶段切换前生成一次
- 长时间中断前生成一次
- review 发现问题后回退时生成一次
