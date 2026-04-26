# Spec 文档索引（Spec Document Index）

> 本文档定义 `.spec/` 运行时目录中的主文档入口，帮助 Agent 和人类都能快速找到当前阶段的关键信息。

## 1. 上游文档入口 | Upstream Document Entries

> 上游文档链在 Constitution 之前生成，确保需求经过充分调研和设计论证。

| 文件 | 作用 | 适用类型 |
|---|---|---|
| `PRD.md` | 产品需求文档（大纲优先迭代） | all |
| `COMPETITOR-RESEARCH.md` | 竞品研究（GitHub/市场竞品分析） | all |
| `ARCHITECTURE.md` | 架构推荐（候选方案对比 + 推荐） | all |
| `UIUX.md` | UIUX 对齐（设计系统 + 页面清单） | web |
| `PRODUCT-DESIGN.md` | 产品设计（页面功能详情 + 验收标准） | web |
| `.page-coverage.json` | 页面覆盖率报告 | web |
| `TODO.md` | SPEC 到 TASKS 的桥接 TODO 清单 | all |

## 2. 下游 SPEC 核心入口 | Downstream SPEC Core Entries

| 文件 | 作用 |
|---|---|
| `SPEC.md` | 主规格总入口，含宪章与高层要求 |
| `TASKS.md` | 当前可执行任务清单 |
| `.orchestration-state.json` | `SpecOrchestrator` 运行时状态 |
| `.workflow-state.json` | 当前阶段状态 |
| `.spec-tracker.json` | 条款覆盖与追踪数据 |

## 3. 建议阅读顺序 | Recommended Reading Order

### 新项目完整阅读顺序

1. 先读上游文档：`PRD.md` → `COMPETITOR-RESEARCH.md` → `ARCHITECTURE.md`
2. Web 项目继续读：`UIUX.md` → `PRODUCT-DESIGN.md` → `.page-coverage.json`
3. 再读下游 SPEC：`SPEC.md` → `TODO.md` → 相关分模板文档
4. 最后读执行层：`TASKS.md` → `.spec-tracker.json` → `.orchestration-state.json`

### 增量迭代阅读顺序

1. 先读 `.workflow-state.json` 确认当前阶段
2. 根据阶段读取对应上游或下游文档
3. 再读 `TASKS.md` 确认待办任务

## 4. Agent 规则

- 不允许只读单个模板就开始实现。
- 实现前至少要读：上游 PRD/ARCHITECTURE + 主需求 + 技术架构 + 任务清单。
- 任务生成前必须先读：`TODO.md`，不允许直接从 `SPEC.md` 跳到 `TASKS.md`。
- Web 项目实现前还必须读：UIUX.md + PRODUCT-DESIGN.md。
- 审查前必须读 tracker 与 review 输出。
- 上游文档缺失时，不得跳过进入下游 SPEC 阶段。
