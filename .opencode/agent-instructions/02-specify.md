# Specify 阶段 Agent 指令 | Specify Phase Instructions

> Agent 在 specify 阶段的完整行为规范：根据 Constitution 和项目类型，渐进式生成 spec 模板文档。

---

## 输入 | Input

- `.spec/SPEC.md` 的 Constitution 章节（constitution 阶段产出）
- 面试结果（项目类型、技术栈、核心功能）
- `.opencode/spec-templates/TEMPLATE-GUIDE.md`（模板依赖图）

## 输出 | Output

- 根据项目类型生成对应模板子集的 spec 文档
- 至少 3 个 US-xxx 条款注册到 spec-tracker

## 渐进式生成流程 | Progressive Generation Flow

### 步骤 1：确定模板子集

读取 TEMPLATE-GUIDE.md，根据项目类型选择模板：
- **Web 全栈**: 全部 12 个
- **API 服务**: 01, 02, 03, 07, 09, 10, 11, 12
- **CLI 工具**: 01, 02, 10, 11, 12

### 步骤 2：按依赖顺序生成

```
01-需求文档 → 02-技术架构 → {04, 05, 07}(并行) → {03, 06}(并行) → 其余
```

对每个模板执行：
1. 读取 `.opencode/spec-templates/{模板名}.md` 获取模板结构
2. 根据 `<!-- AGENT: ... -->` 指令填充每个章节
3. 用 `[NEEDS CLARIFICATION]` 标记不确定项（**每个文档最多 3 个**）
4. 将生成的文档写入 `.spec/{模板名}.md`

### 步骤 3：注册 spec 条款

从生成的 01-需求文档中提取所有 US-xxx 和 AC-xxx 条款，调用 spec-tracker 的 `registerClause()` 注册。

### 决策树 | Decision Tree

```
面试结果.项目类型
├── "web" → 生成全部 12 个模板
│   └── 面试结果.hasUI = true → 04-设计规范 required
│   └── 面试结果.hasDB = true → 07-数据库设计 required
├── "api" → 生成 8 个模板（跳过 04,05,06,08）
│   └── 面试结果.hasDB = true → 07-数据库设计 required
│   └── 面试结果.hasAuth = true → 11-安全规范 required
└── "cli" → 生成 5 个模板（最小集）
    └── 面试结果.hasDB = true → 07-数据库设计 optional→required
```

## 每个模板的生成指令 | Per-Template Instructions

对每个模板，Agent 必须：

1. **读取模板文件** — 理解章节结构和 `<!-- AGENT: -->` 指令
2. **填充内容** — 根据 Constitution + 面试结果生成具体内容
3. **交叉引用** — 检查 `<!-- depends-on: -->` 标记，确保依赖模板已生成
4. **质量检查** — 每个生成的文档 ≥200 行，≥40% 具体内容（非模板骨架）
5. **标记不确定项** — 信息不足时用 `[NEEDS CLARIFICATION]` 而非猜测

## [NEEDS CLARIFICATION] 使用规则

- 仅在面试信息确实不足以确定某个具体值时使用
- 每个文档最多 3 个
- 格式：`[NEEDS CLARIFICATION: 具体问题描述]`
- 不允许用于整个章节（章节级别必须有内容框架）
- 面试已回答的问题不允许标记为 NEEDS CLARIFICATION

## 质量标准 | Quality Standards

| 指标 | 要求 |
|---|---|
| 每个文档行数 | ≥200 行 |
| 具体内容占比 | ≥40%（非模板结构的实质内容） |
| 裸占位符 | 零（`[xxx]` 格式不允许） |
| NEEDS CLARIFICATION | 每文档 ≤3 个 |
| 代码示例 | 技术类模板（02,03,07）必须含代码示例 |

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("specify")` 必须返回 `{ valid: true }`：
- spec-tracker 中已注册 ≥3 个 US/AC 条款

## 模板填充顺序细则 | Template Filling Rules

### 需求模板优先
- 先完成 01-需求文档中的用户故事、验收标准、范围界定。
- 如果 01 未完成，不允许继续生成 02/03。

### 技术模板跟随约束
- 02-技术架构必须引用 Constitution 的 Constraints。
- 03-接口文档必须与 07-数据库设计的数据模型一致。

### Web 专属模板
- 04/05/06 只在项目类型为 web 时生成。
- 页面流程与页面功能细节必须共享相同路由命名。

## 自检清单 | Self-Check Checklist

- [ ] 所有 required 模板都已生成
- [ ] 所有 skip 模板都未误生成
- [ ] 每个文档的 `[NEEDS CLARIFICATION]` 不超过 3 个
- [ ] 所有 US/AC 条款已注册到 spec-tracker
- [ ] 文档间依赖顺序没有违反 TEMPLATE-GUIDE

## 常见错误 | Common Failure Modes

- 直接生成所有模板，忽略项目类型
- 在信息不足时胡乱假设，而不是显式标记澄清点
- 生成 API 文档却没有对应数据模型
- 页面文档与需求文档使用不同术语

## 引用 | References

- `spec-tracker.ts: registerClause()` — 条款注册 API
- `TEMPLATE-GUIDE.md` — 模板依赖图和项目类型子集
- `01-constitution.md` — 上一阶段产出的 Constitution
