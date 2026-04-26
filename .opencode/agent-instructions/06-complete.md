# Complete 阶段 Agent 指令 | Complete Phase Instructions

> Agent 在 complete 阶段的行为规范：最终审查和交付。

---

## 输入 | Input

- 所有实现代码
- 所有 spec 文档
- spec-tracker 状态

## 输出 | Output

- 最终审查报告
- 覆盖率报告

## 执行流程 | Execution Flow

### 1. 运行全面审查

调用 `performSpecReview()` 执行：
- 文件存在性检查
- 模板完整性检查（空章节、裸占位符）
- 条款覆盖检查
- 任务质量检查
- 模板间交叉引用一致性

### 2. 生成覆盖率报告

调用 `generateCoverageReport()` 获取：
- 总条款数 / 已完成数 / 覆盖率百分比
- 按章节的覆盖率明细
- 未完成条款列表
- TODO 级别的跟踪摘要（todoSummary）

### 3. 检查未完成条款

调用 `getIncompleteClauses()` 获取未完成列表：
- 如果有未完成条款 → 评估是否为 blocking（核心功能 vs 可选功能）
- 核心功能未完成 → 返回 implement 阶段补充
- 可选功能未完成 → 记录为已知限制

### 4. 运行最终测试

- 执行项目测试套件（`bun test` / `npm test`）
- 验证构建成功（`bun run build` / `npm run build`）
- 检查 lint 通过

## 最终审查清单 | Final Review Checklist

- [ ] `performSpecReview()` 返回 verdict ≠ "REJECT"
- [ ] 所有测试通过
- [ ] 构建成功
- [ ] spec-tracker 覆盖率 ≥80%
- [ ] 无裸 `[placeholder]` 在 spec 文档中
- [ ] 所有 blocking issues 已解决
- [ ] 代码无 `console.log`（生产代码）
- [ ] 无 `@ts-ignore` 或 `as any`

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("complete")` 必须返回 `{ valid: true }`：
- `performSpecReview()` 无 blocking issues（severity ≠ "error"）

## 交付前最终检查 | Pre-Delivery Checks

1. 对照需求文档确认所有 P0 故事已覆盖。
2. 对照 TASKS.md 确认没有遗漏未完成任务。
3. 对照覆盖率报告中的 `todoSummary` 确认 bridge todo 已被任务覆盖并有执行状态。
4. 对照 spec-tracker 确认未完成条款是否均为可接受的 optional 项。
5. 对照最终审查报告确认没有 REJECT 级别问题。
6. 确认 `.spec/TASKS.md` 中已显式存在：联调任务、缺陷修复任务、回归任务。

## 禁止事项 | Must NOT Do

- 不要在 complete 阶段偷偷修改需求范围。
- 不要跳过 review 直接宣布完成。
- 不要把 warning 当成 blocking，但要明确记录。

## 自检清单 | Self-Check Checklist

- [ ] 审查报告已生成
- [ ] 覆盖率报告已生成
- [ ] 已知限制已记录
- [ ] 交付结论与实际证据一致

## 输出格式建议 | Suggested Output Format

最终交付报告建议包含以下 4 段：

1. **Summary** — 本次交付完成了哪些 P0/P1 功能
2. **Verification** — 测试、构建、spec-review、coverage 的结果
3. **Known Limits** — 未完成但不阻塞交付的事项
4. **Next Steps** — 推荐的后续迭代方向

## 常见错误 | Common Failure Modes

- 将 warning 误判为必须回滚的阻塞问题
- 未核对 spec-tracker 就宣布所有条款已完成
- 报告里声称“全部通过”，但没有证据文件支撑

## 引用 | References

- `spec-review.ts: performSpecReview()` — 全面审查
- `spec-review.ts: generateSpecCoverageReport()` — 格式化覆盖率报告
- `spec-tracker.ts: getIncompleteClauses()` — 未完成条款
