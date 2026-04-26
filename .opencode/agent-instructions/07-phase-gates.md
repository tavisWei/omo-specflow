# 阶段质量门控（Phase Quality Gates）

> 本文档定义 Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Test → Complete 十个阶段的统一放行标准。Agent 不得凭主观判断跳过门控。

## 1. 总规则

1. 当前阶段未通过，不得进入下一阶段。
2. 门控失败必须返回"缺什么、为什么缺、怎么补"。
3. 所有门控都应优先用可执行检查验证，而非人工判断。

## 2. 上游阶段门槛 | Upstream Phase Gates

| 阶段 | 最低要求 | 产出文件 | 失败时动作 |
|---|---|---|---|
| discovery | PRD 大纲已确认 + ≥3 竞品分析 | `PRD.md`, `COMPETITOR-RESEARCH.md` | 回补 PRD 或竞品研究 |
| architecture | ≥2 候选方案 + 有推荐方案 + 架构图 | `ARCHITECTURE.md` | 回补架构对比与推荐 |
| design | 页面覆盖率 ≥90% + 数据模型对齐 | `UIUX.md`, `PRODUCT-DESIGN.md`, `.page-coverage.json` | 回补页面清单或对齐数据模型 |

### 上游门控详细检查 | Upstream Gate Details

**Discovery 门控**:
- `PRD.md` 存在且包含 5 个一级章节
- 用户已输入"已确认大纲"
- `COMPETITOR-RESEARCH.md` 存在且包含 ≥3 竞品分析
- 功能对比表覆盖所有 P0 功能

**Architecture 门控**:
- `ARCHITECTURE.md` 存在且包含 ≥2 候选方案
- 有方案对比表
- 有明确推荐方案和理由
- 有架构图（Mermaid）

**Design 门控**:
- `UIUX.md` 存在且包含设计系统、页面清单、页面关系树
- `PRODUCT-DESIGN.md` 存在且包含所有页面的功能详情
- `.page-coverage.json` 存在且覆盖率 ≥90%
- 数据字段与 `ARCHITECTURE.md` 数据模型对齐

## 3. 下游 SPEC 阶段门槛 | Downstream SPEC Phase Gates

| 阶段 | 最低要求 | 失败时动作 |
|---|---|---|
| constitution | SPEC.md 含 Vision / Values / Constraints | 回补宪章章节 |
| specify | 至少 3 个故事或条款已注册 | 回补需求与验收标准 |
| plan | TASKS.md 已生成且至少 1 个任务 | 回补任务计划 |
| tasks | 每任务有 AC + Spec Refs + Files | 继续细化任务 |
| implement | 覆盖率达到阈值，关键任务已完成 + 单元测试证据齐全 | 回到任务执行 |
| test | 联调/回归证据齐全 + bugfix 已验证 | 回到实现或测试 |
| complete | spec-review 无 blocking issues | 回到实现或修订文档 |

## 4. 门控输出格式

```markdown
Gate: tasks
Result: FAIL
Reasons:
- Task 3 missing Acceptance Criteria
- Task 5 missing Spec Refs
Next Action:
- Refine Task 3 and Task 5 before nextPhase()
```

## 5. 强制阻断场景

- 缺少上游文档（PRD.md / ARCHITECTURE.md / UIUX.md / PRODUCT-DESIGN.md）
- 缺少根文档（SPEC.md / TASKS.md）
- 关键模板为空章节
- 任务没有验收标准
- spec-review 结果为 REJECT
- 页面覆盖率 <90%（Web 项目）
