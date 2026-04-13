# Plan 阶段 Agent 指令 | Plan Phase Instructions

> Agent 在 plan 阶段的行为规范：将 spec 文档分解为可执行的任务列表。

---

## 输入 | Input

- 所有已生成的 `.spec/` 文档
- `.opencode/agent-instructions/tasks-format-spec.md`（TASKS.md 格式规范）

## 输出 | Output

- `.spec/TASKS.md` — 遵循 tasks-format-spec.md 格式的任务列表

## 任务分解规则 | Task Decomposition Rules

### 1. 按用户故事分组

从 `.spec/01-需求文档.md` 提取所有 US-xxx 条款，每个故事拆为 1-N 个原子任务。

### 2. 原子任务粒度

- 每个任务触及 **1-3 个文件**
- Agent 执行时间 **2-5 分钟**
- 只处理 **1 个关注点**（feature/fix/config）
- 触及 4+ 文件 → 必须拆分
- 涉及 2+ 不相关关注点 → 必须拆分

### 3. 并行化策略 | Parallelization Strategy

**Wave 1（基础设施）**: 提取共享依赖为独立任务
- 类型定义文件（types.ts, interfaces.ts）
- 配置文件（tsconfig, package.json, env）
- 数据库 schema / 迁移
- 共享工具函数

**Wave 2+（功能实现）**: 按用户故事并行
- 同一故事内的任务串行（有依赖）
- 不同故事的任务并行（无依赖）

**最后 Wave（集成）**: 
- 测试套件
- 文档更新
- 配置调整

### 4. 依赖标注

每个任务必须标注：
- `Blocked By:` — 必须先完成的任务
- `Blocks:` — 依赖本任务的后续任务
- `Can Run In Parallel:` — YES/NO

### 5. Category 分配

| 任务类型 | Category |
|---|---|
| 配置、脚手架、简单修改 | `quick` |
| 核心业务逻辑、复杂实现 | `deep` |
| UI 组件、页面 | `unspecified-high` |
| 文档、设计 | `writing` |
| 审查、验证 | `oracle` |

## 生成流程 | Generation Flow

1. 读取所有 spec 文档，提取用户故事和技术决策
2. 识别共享依赖，创建 Wave 1 基础设施任务
3. 按用户故事创建功能任务，标注依赖关系
4. 创建集成/测试任务
5. 为每个任务填写完整的 tasks-format-spec 格式字段
6. 验证无循环依赖（可调用 `analyzeDependencies()`）

## 质量标准

- 每个任务有 `**What to do**:` 具体步骤（不是模糊描述）
- 每个任务有 `**Files**:` 具体文件路径
- 每个任务有 `**Acceptance Criteria**:` 可验证条件
- 每个任务有 `**Spec Refs**:` 关联条款

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("plan")` 必须返回 `{ valid: true }`：
- `.spec/TASKS.md` 存在且包含至少 1 个任务（`## Task N:` 格式）

## 计划编排规则 | Planning Orchestration Rules

- 优先提取“共享依赖任务”，如 schema、types、config、auth foundation。
- 每个用户故事至少拆成 1 个可交付任务，不允许只出现基础设施任务。
- 每个任务必须能被单个 Agent 独立理解，不依赖隐式上下文。
- 若任务描述需要“顺便”或“另外”，说明粒度过大，应继续拆分。

## 输出质量门槛 | Output Thresholds

- 每个任务必须有明确输入和输出。
- 每个任务必须给出文件级作用域。
- 每个任务必须能在 QA 场景中被直接验证。

## 自检清单 | Self-Check Checklist

- [ ] 是否已覆盖所有 P0/P1 用户故事
- [ ] 是否存在过大任务（4+ files）
- [ ] 是否存在缺少验收标准的任务
- [ ] 是否已标记并行关系
