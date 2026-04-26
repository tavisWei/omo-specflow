# 产品设计文档（Product Design）
<!-- depends-on: PRD.md, ARCHITECTURE.md, UIUX.md -->
<!-- required-for: web -->
<!-- generation-order: 0.4 -->
<!-- artifact: PRODUCT-DESIGN.md -->

<!-- AGENT: 从 UIUX.md 提取页面列表，为每个页面定义功能点、数据字段、交互状态、错误处理。与 ARCHITECTURE.md 数据模型对齐。 -->

## 1. 页面功能详情 | Page Function Details

<!-- AGENT: 为 UIUX.md 中的每个页面生成详细功能描述。 -->

### 1.1 <!-- AGENT: 页面 1 名称 -->

#### 基本信息 | Basic Info

- **路由 Route**: <!-- AGENT: 从 UIUX.md 提取 -->
- **角色 Roles**: <!-- AGENT: 从 UIUX.md 提取 -->
- **场景 Scenarios**: <!-- AGENT: 从 UIUX.md 提取 -->

#### 功能点 | Features

| # | 功能 Feature | 描述 Description | 优先级 Priority |
|---|---|---|---|
| 1 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | P0 |
| 2 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | P0 |

#### 数据字段 | Data Fields

| 字段 Field | 类型 Type | 来源 Source | 说明 Description |
|---|---|---|---|
| <!-- AGENT: 如 "id" --> | <!-- AGENT: 如 "string" --> | <!-- AGENT: 如 "API" --> | <!-- AGENT: 说明 --> |
| <!-- AGENT: 如 "name" --> | <!-- AGENT: 如 "string" --> | <!-- AGENT: 如 "用户输入" --> | <!-- AGENT: 说明 --> |

#### 交互状态 | Interaction States

| 状态 State | 触发 Trigger | 展示 Display |
|---|---|---|
| 加载中 Loading | <!-- AGENT: 如 "页面初始化" --> | <!-- AGENT: 如 "骨架屏" --> |
| 成功 Success | <!-- AGENT: 如 "数据加载完成" --> | <!-- AGENT: 如 "正常内容" --> |
| 错误 Error | <!-- AGENT: 如 "网络失败" --> | <!-- AGENT: 如 "错误提示 + 重试按钮" --> |
| 空状态 Empty | <!-- AGENT: 如 "无数据" --> | <!-- AGENT: 如 "空状态插图 + 引导" --> |

#### 错误处理 | Error Handling

| 错误类型 Error Type | 处理方式 Handling |
|---|---|
| <!-- AGENT: 如 "网络错误" --> | <!-- AGENT: 如 "显示错误提示，提供重试按钮" --> |
| <!-- AGENT: 如 "权限不足" --> | <!-- AGENT: 如 "跳转到登录页" --> |

---

### 1.2 <!-- AGENT: 页面 2 名称 -->

#### 基本信息 | Basic Info

- **路由 Route**: <!-- AGENT: 从 UIUX.md 提取 -->
- **角色 Roles**: <!-- AGENT: 从 UIUX.md 提取 -->

#### 功能点 | Features

| # | 功能 Feature | 描述 Description | 优先级 Priority |
|---|---|---|---|
| 1 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | P0 |

#### 数据字段 | Data Fields

| 字段 Field | 类型 Type | 来源 Source | 说明 Description |
|---|---|---|---|
| <!-- AGENT: 字段名 --> | <!-- AGENT: 类型 --> | <!-- AGENT: 来源 --> | <!-- AGENT: 说明 --> |

#### 交互状态 | Interaction States

| 状态 State | 触发 Trigger | 展示 Display |
|---|---|---|
| 加载中 Loading | <!-- AGENT: 触发条件 --> | <!-- AGENT: 展示方式 --> |
| 成功 Success | <!-- AGENT: 触发条件 --> | <!-- AGENT: 展示方式 --> |
| 错误 Error | <!-- AGENT: 触发条件 --> | <!-- AGENT: 展示方式 --> |

---

## 2. 页面-功能映射 | Page-Function Mapping

<!-- AGENT: 检查所有 P0 功能是否都有对应页面。 -->

| P0 功能 P0 Feature | 覆盖页面 Covered Page | 覆盖率 Coverage |
|---|---|---|
| <!-- AGENT: 从 PRD.md 提取 P0 功能 1 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |
| <!-- AGENT: 从 PRD.md 提取 P0 功能 2 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |
| <!-- AGENT: 从 PRD.md 提取 P0 功能 3 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |

---

## 2.1 页面跳转详情 | Page Transition Details

<!-- AGENT: 逐条列出关键页面之间的流转，要求能据此恢复前端项目的页面关系树。 -->

| 来源页面 From | 交互动作 Action | 目标页面 To | 成功/失败路径 Outcome |
|---|---|---|---|
| <!-- AGENT: 如 "登录页" --> | <!-- AGENT: 如 "点击登录" --> | <!-- AGENT: 如 "仪表盘" --> | <!-- AGENT: 如 "成功进入仪表盘 / 失败显示错误提示" --> |

---

## 2.2 页面功能缺口 | Page Coverage Gaps

<!-- AGENT: 对照 PRD P0/P1 功能，列出尚未被页面承接的功能缺口。若无缺口，也必须明确写“无缺口”。 -->

| 功能 Feature | 当前状态 Status | 缺口说明 Gap Notes | 处理建议 Recommendation |
|---|---|---|---|
| <!-- AGENT: 如 "批量导出" --> | <!-- AGENT: 已覆盖/未覆盖/部分覆盖 --> | <!-- AGENT: 说明 --> | <!-- AGENT: 建议 --> |

---

## 3. 数据模型对齐 | Data Model Alignment

<!-- AGENT: 检查页面数据字段与 ARCHITECTURE.md 数据模型是否一致。 -->

### 3.1 实体字段对照 | Entity Field Mapping

| 实体 Entity | 页面使用字段 Used Fields | 架构定义字段 Defined Fields | 状态 Status |
|---|---|---|---|
| <!-- AGENT: 如 "User" --> | <!-- AGENT: 如 "id, name, email" --> | <!-- AGENT: 从 ARCHITECTURE.md 提取 --> | ✅ 一致 |

### 3.2 字段差异说明 | Field Differences

<!-- AGENT: 如有差异，说明原因。 -->

- <!-- AGENT: 如 "页面额外显示 avatar 字段，需在架构中补充" -->

---

## 4. 验收标准汇总 | Acceptance Criteria Summary

<!-- AGENT: 为每个页面生成验收标准。 -->

### 4.1 <!-- AGENT: 页面 1 名称 --> 验收标准

| # | 验收标准 Acceptance Criteria | 测试方式 Test Method |
|---|---|---|
| 1 | <!-- AGENT: 如 "页面加载时间 < 2s" --> | <!-- AGENT: 如 "Lighthouse 测试" --> |
| 2 | <!-- AGENT: 如 "表单提交成功后显示 toast" --> | <!-- AGENT: 如 "手动测试" --> |

### 4.2 <!-- AGENT: 页面 2 名称 --> 验收标准

| # | 验收标准 Acceptance Criteria | 测试方式 Test Method |
|---|---|---|
| 1 | <!-- AGENT: 验收标准 --> | <!-- AGENT: 测试方式 --> |

---

## 5. 页面覆盖率报告 | Page Coverage Report

<!-- AGENT: 生成 .page-coverage.json 的内容摘要。 -->

```json
{
  "totalPages": <!-- AGENT: 页面总数 -->,
  "totalModals": <!-- AGENT: 弹窗总数 -->,
  "coveredScenarios": <!-- AGENT: 已覆盖场景数 -->,
  "totalScenarios": <!-- AGENT: 总场景数 -->,
  "coverage": "<!-- AGENT: 覆盖率百分比 -->%",
  "uncoveredFeatures": [<!-- AGENT: 未覆盖功能列表或空数组 -->]
}
```

---

## 文档间契约 | Downstream Contracts

- 下游 `01-需求文档.md` 必须继承本文档的验收标准。
- 下游 `06-页面功能细节.md` 必须继承本文档的页面功能详情。
- 下游 `03-接口文档.md` 必须继承本文档的数据字段定义。

---

## Agent 生成检查表 | Agent Completion Checklist

- [ ] 所有 UIUX.md 页面都有功能详情
- [ ] 所有 P0 功能都有页面覆盖
- [ ] 数据字段与 ARCHITECTURE.md 一致
- [ ] 每个页面有验收标准
- [ ] 有页面覆盖率报告
- [ ] 零 `[placeholder]` 残留
