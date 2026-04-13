# 证据规范（Evidence Convention）

> 定义 `.sisyphus/evidence/` 下的文件命名与内容规则，保证实现、测试、审查结果都能被追踪。

## 1. 命名规则

`task-{taskId}-{scenario-slug}.txt`

示例：
- `task-2-auth-login.txt`
- `task-5-list-pagination.txt`
- `final-review-summary.txt`

## 2. 证据内容最低要求

- 执行时间
- 执行命令或步骤
- 关键输出
- 通过/失败结论

## 3. 规则

- 每个已完成任务至少 1 个 evidence 文件
- 最终 review 必须有独立 evidence
- 不允许只有“pass”而没有上下文
