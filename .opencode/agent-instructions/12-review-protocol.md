# 审查协议（Review Protocol）

> 定义多 Agent 执行后的统一审查方式，避免“实现完成了但没有统一验收口径”。

## 1. 审查维度

| 维度 | 检查内容 |
|---|---|
| Scope | 是否覆盖原始需求和 P0/P1 条款 |
| Spec Alignment | 是否符合 spec 文档和任务约束 |
| Quality | 是否存在明显低质量实现 |
| Security | 是否违反安全规范 |
| Evidence | 是否有可执行证据支撑 |

## 2. 审查输出

```markdown
Verdict: APPROVE / WARNING / REJECT
Findings:
- Scope:
- Quality:
- Security:
- Evidence:
Required Follow-up:
- ...
```

## 3. 阻断条件

- 缺证据但声称已完成
- 与 spec 明显不一致
- 关键安全问题
- P0 条款未覆盖
