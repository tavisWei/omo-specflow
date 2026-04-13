# 15 - 存量项目迭代模式 (Brownfield Mode) | Existing Project Iteration

> 本文档定义在已有项目（Brownfield）中进行功能迭代、重构或修复的标准化工作流。

---

## 1. 目的 | Purpose
确保在现有代码库中引入变更时，能够充分理解当前状态，准确评估影响范围，并防止功能退化（Regression）。

## 2. 适用场景 | When to Use
- 在已有项目中增加新功能。
- 对现有模块进行重构。
- 修复涉及多个模块的复杂 Bug。
- 升级核心依赖或中间件。

## 3. 必需输入 | Required Inputs
- **现有代码库**: 完整的源码访问权限。
- **变更需求**: 明确的功能描述或 Bug 报告。
- **现有文档**: 架构图、API 文档、README（如有）。
- **测试套件**: 现有的单元测试、集成测试或 E2E 测试。

## 4. 预期输出 | Expected Outputs
- **现状扫描报告**: 对相关模块的当前实现、依赖关系和测试覆盖情况的总结。
- **影响分析 (Impact Analysis)**: 详见 `16-impact-analysis.md`。
- **增量 Spec (Delta Spec)**: 仅描述变更部分的规格说明。
- **回归计划 (Regression Plan)**: 详见 `17-regression-planning.md`。

## 5. 步骤规则 | Step-by-Step Rules

### 第一步：现状扫描 (Current-State Scan)
1. **定位代码**: 使用 `grep` 或 `lsp_find_references` 确定受影响的核心文件。
2. **分析依赖**: 梳理受影响模块的上游调用方和下游依赖项。
3. **评估测试**: 检查相关代码是否有现成测试，并运行它们以确认基准状态。

### 第二步：影响分析 (Impact Analysis)
1. 按照 `16-impact-analysis.md` 模板执行深度分析。
2. 识别“破坏性变更” (Breaking Changes) 和“副作用” (Side Effects)。
3. 必须由 Agent 显式输出分析结果并请求用户确认。

### 第三步：增量规格定义 (Delta Spec)
1. 在 `.spec/` 目录下创建或更新相关文档。
2. 使用 `[MODIFIED]`, `[ADDED]`, `[DELETED]` 标签标注变更。
3. 保持与现有架构风格的一致性，除非任务目标是重构。

### 第四步：增量任务分解 (Incremental Tasks)
1. 任务必须包含“环境准备”和“回归验证”步骤。
2. 优先处理高风险的底层变更。
3. 每个任务的 AC 必须包含对现有功能的兼容性检查。

### 第五步：回归与评审 (Regression & Review)
1. 执行 `17-regression-planning.md` 中定义的回归测试。
2. 提交 PR 前，必须证明现有功能未受损。

## 6. 下游契约 | Downstream Contracts
- **Plan 阶段**: 必须引用影响分析结果来评估工作量。
- **Implement 阶段**: 必须先运行基准测试，再开始编码。
- **Complete 阶段**: 必须提交回归测试证据。

## 7. 增量规格更新规则 | Delta Spec Update Rules
- 仅更新受影响的 spec 文档，不全量重写全部模板。
- 需求变更必须显式标记为 `[ADDED]` / `[MODIFIED]` / `[DEPRECATED]`。
- 若改动涉及接口、数据库或权限，至少同步更新两个相关文档。
- 若存在向后兼容要求，必须在增量 spec 中写清“不允许变化”的行为。

## 8. 证据与交接要求 | Evidence and Handoff Requirements
- 每个增量任务至少对应 1 个 evidence 文件。
- 阶段切换前必须生成 handoff 摘要。
- 影响分析、回归计划、最终 review 三类证据都不能缺失。

## 9. Agent 执行清单 | Agent Checklist
- [ ] 是否已扫描所有受影响的调用链路？
- [ ] 是否已识别出所有潜在的破坏性变更？
- [ ] 增量 Spec 是否与现有文档冲突？
- [ ] 回归计划是否覆盖了所有高风险区域？
- [ ] 是否已验证现有测试在变更前是全绿的？

---

## 示例流程 | Example Workflow

1. **用户**: "在现有的 Auth 模块中增加 GitHub OAuth 支持。"
2. **Agent**: 
   - 扫描 `src/auth/`, `prisma/schema.prisma`。
   - 发现 `User` 模型需要增加 `githubId` 字段。
   - 输出 `16-impact-analysis.md`：识别到数据库迁移风险和现有 JWT 逻辑的兼容性。
   - 更新 `.spec/03-接口文档.md`：增加 `/api/auth/github`。
   - 生成任务：1. 数据库迁移；2. OAuth 策略实现；3. 回归测试现有登录。

## 11. 常见失败模式 | Common Brownfield Failure Modes
- 把存量项目误当成绿地项目，导致全量重写文档。
- 只写“新增什么”，不写“哪些行为不能变”。
- 先编码后做影响分析。
- 只验证新增功能，不做兼容性和回归验证。
