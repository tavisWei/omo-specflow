# Tasks 阶段 Agent 指令 | Tasks Phase Instructions

> Agent 在 tasks 阶段的行为规范：细化 TASKS.md 中每个任务的质量。

---

## 输入 | Input

- `.spec/TASKS.md`（plan 阶段产出的初版）
- 所有 spec 文档（用于补充 spec 引用）

## 输出 | Output

- 细化后的 `.spec/TASKS.md`，每个任务补充完整的验收标准、QA 场景、文件路径

## 细化流程 | Refinement Flow

### 对每个任务执行：

1. **补充 Acceptance Criteria** — 每个任务至少 2 个可验证的 checkbox 条件
2. **补充 QA Scenarios** — 至少 1 个 Agent 可执行的验证场景（含 Tool、Steps、Expected Result）
3. **验证文件路径** — 确保 `**Files**:` 中的路径合理且不重复
4. **补充 Spec Refs** — 确保每个任务关联至少 1 个 US/AC 条款
5. **补充 Source TODOs** — 确保每个任务关联至少 1 个 `TODO-xxx`
6. **补充 Integration / Bug Fix / Regression 字段** — 对联调、缺陷修复、回归任务明确记录治理信息
7. **验证 Category** — 确保 category 与任务复杂度匹配

### 质量检查

对每个任务调用 `validateTaskQuality(taskBlock)` 检查：
- 有 Acceptance Criteria
- 有文件路径
- 有 spec 条款引用
- 有 Source TODOs 引用
- 联调 / Bug 修复 / 回归任务有对应专属字段
- 有 category 标签

### 依赖分析

调用 `analyzeDependencies()` 验证：
- 无循环依赖
- Wave 分组合理
- 并行标注正确

## 任务质量检查清单 | Task Quality Checklist

每个任务必须通过以下检查：

- [ ] 有明确的 `category:` 标签
- [ ] `**What to do**:` 包含具体步骤（非模糊描述）
- [ ] `**Files**:` 列出 1-3 个具体文件路径
- [ ] `**Acceptance Criteria**:` 有 ≥2 个 checkbox 条件
- [ ] `**Spec Refs**:` 关联至少 1 个 US/AC 条款
- [ ] `**Source TODOs**:` 关联至少 1 个 TODO-xxx
- [ ] 联调任务包含 `**Integration Validation**:`
- [ ] 缺陷修复任务包含 `**Bug Fix Trace**:`
- [ ] 回归任务包含 `**Regression Scope**:`
- [ ] `**Parallelization**:` 标注了 Blocked By 和 Blocks

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("tasks")` 必须返回 `{ valid: true }`：
- 每个任务有 Acceptance Criteria
- 每个任务有 spec 条款引用（US-xxx 或 AC-xxx）

## QA 场景编写规则 | QA Scenario Rules

- 每个任务至少 1 个 QA 场景，复杂任务至少 2 个。
- QA 场景必须写明 Tool、Steps、Expected Result、Evidence。
- 优先使用可自动执行的命令，不使用“人工查看是否正确”作为标准。

## 拆分修正规则 | Split Correction Rules

- 如果任务 Files 超过 3 个，优先按层拆分（schema / service / route / ui）。
- 如果任务同时包含“实现 + 文档 + 测试”，通常应拆为 2-3 个任务。
- 如果任务没有明确依赖，就默认允许并行。

## 自检清单 | Self-Check Checklist

- [ ] 每个任务是否都能直接派发给 Agent
- [ ] 每个任务是否都包含至少一个证据文件路径
- [ ] 是否没有笼统措辞（如“完善一下”“优化一些”）

## 常见修正动作 | Common Corrections

- 如果 Acceptance Criteria 只是“完成实现”，改写为可验证结果。
- 如果 Files 缺失，先回到 spec 文档补足文件级范围，再继续细化任务。
- 如果 Spec Refs 过多，优先按故事边界重新拆分任务。
- 如果缺少 Source TODOs，先回到 `.spec/TODO.md` 补齐桥接映射，再继续细化任务。
- 如果任务属于联调 / bugfix / regression，但没有专属字段，视为不可执行任务，必须重写。
- 如果 QA Scenarios 无法自动执行，说明任务定义还不够具体。

## 输出示例片段 | Output Example Fragment

```markdown
**Acceptance Criteria**:
- [ ] `bun test` 通过
- [ ] `GET /api/v1/todos` 返回 200 和分页结构

**QA Scenarios**:
Scenario: List todos endpoint works
  Tool: Bash (curl)
  Steps:
    1. curl /api/v1/todos
    2. 验证状态码和 JSON 字段
  Expected Result: 200 + items/pagination
```

## 引用 | References

- `spec-review.ts: validateTaskQuality()` — 单任务质量验证
- `task-dispatcher.ts: analyzeDependencies()` — 依赖拓扑排序
- `tasks-format-spec.md` — TASKS.md 格式规范
