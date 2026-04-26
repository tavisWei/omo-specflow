# UIUX 对齐文档（UIUX Alignment）
<!-- depends-on: PRD.md, ARCHITECTURE.md -->
<!-- required-for: web -->
<!-- generation-order: 0.3 -->
<!-- artifact: UIUX.md -->

<!-- AGENT: 从 PRD.md 提取核心场景和用户角色；从 ARCHITECTURE.md 确认前端技术栈。定义设计系统、页面流程、交互规范。 -->

## 1. 设计系统 | Design System

<!-- AGENT: 定义全局设计规范。 -->

### 1.1 品牌气质 | Brand Personality

<!-- AGENT: 从 PRD.md 1.2 产品定位推导品牌气质。 -->

- **关键词**: <!-- AGENT: 如 "简洁、专业、高效" -->
- **避免**: <!-- AGENT: 如 "花哨、复杂、娱乐化" -->

### 1.2 色彩规范 | Color Palette

| 用途 Usage | 色值 Color | 说明 Description |
|---|---|---|
| 主色 Primary | <!-- AGENT: 如 "#3B82F6" --> | <!-- AGENT: 主要按钮、链接 --> |
| 成功 Success | <!-- AGENT: 如 "#22C55E" --> | <!-- AGENT: 成功状态 --> |
| 警告 Warning | <!-- AGENT: 如 "#F59E0B" --> | <!-- AGENT: 警告状态 --> |
| 错误 Error | <!-- AGENT: 如 "#EF4444" --> | <!-- AGENT: 错误状态 --> |
| 背景 Background | <!-- AGENT: 如 "#FFFFFF" --> | <!-- AGENT: 页面背景 --> |
| 文字 Text | <!-- AGENT: 如 "#1F2937" --> | <!-- AGENT: 主文字 --> |

### 1.3 排版规范 | Typography

| 元素 Element | 字号 Size | 字重 Weight | 行高 Line Height |
|---|---|---|---|
| H1 标题 | <!-- AGENT: 如 "32px" --> | <!-- AGENT: 如 "700" --> | <!-- AGENT: 如 "1.2" --> |
| H2 标题 | <!-- AGENT: 如 "24px" --> | <!-- AGENT: 如 "600" --> | <!-- AGENT: 如 "1.3" --> |
| 正文 | <!-- AGENT: 如 "16px" --> | <!-- AGENT: 如 "400" --> | <!-- AGENT: 如 "1.5" --> |
| 小字 | <!-- AGENT: 如 "14px" --> | <!-- AGENT: 如 "400" --> | <!-- AGENT: 如 "1.4" --> |

### 1.4 间距规范 | Spacing

<!-- AGENT: 定义间距系统。 -->

- **基础单位**: <!-- AGENT: 如 "4px" -->
- **常用间距**: <!-- AGENT: 如 "8px, 16px, 24px, 32px" -->

### 1.5 组件库 | Component Library

<!-- AGENT: 从 ARCHITECTURE.md 前端技术栈推导组件库。 -->

- **组件库**: <!-- AGENT: 如 "shadcn/ui" -->
- **图标库**: <!-- AGENT: 如 "Lucide Icons" -->
- **动画库**: <!-- AGENT: 如 "Framer Motion" 或 "无" -->

---

## 2. 页面清单 | Page Inventory

<!-- AGENT: 从 PRD.md 2.2 核心场景推导页面列表。 -->

| # | 页面 Page | 路由 Route | 角色 Roles | 场景 Scenarios |
|---|---|---|---|---|
| 1 | <!-- AGENT: 如 "登录页" --> | <!-- AGENT: 如 "/login" --> | <!-- AGENT: 如 "未登录用户" --> | <!-- AGENT: 如 "场景 1" --> |
| 2 | <!-- AGENT: 如 "仪表盘" --> | <!-- AGENT: 如 "/dashboard" --> | <!-- AGENT: 如 "已登录用户" --> | <!-- AGENT: 如 "场景 2" --> |
| 3 | <!-- AGENT: 如 "列表页" --> | <!-- AGENT: 如 "/items" --> | <!-- AGENT: 如 "运营人员" --> | <!-- AGENT: 如 "场景 3" --> |

---

## 3. 页面关系树 | Page Relation Tree

<!-- AGENT: 用 Mermaid flowchart 描述页面之间的导航关系。 -->

```mermaid
flowchart TB
    <!-- AGENT: 根据页面清单生成页面关系树 -->
    Login["登录页 /login"]
    Dashboard["仪表盘 /dashboard"]
    List["列表页 /items"]
    Detail["详情页 /items/:id"]
    
    Login --> Dashboard
    Dashboard --> List
    List --> Detail
```

---

## 3.1 页面跳转矩阵 | Page Transition Matrix

<!-- AGENT: 列出关键页面之间的跳转关系，确保可据此还原完整前端页面流。 -->

| 来源页面 From | 触发 Trigger | 目标页面 To | 条件 Condition |
|---|---|---|---|
| <!-- AGENT: 如 "登录页" --> | <!-- AGENT: 如 "登录成功" --> | <!-- AGENT: 如 "仪表盘" --> | <!-- AGENT: 如 "认证通过" --> |
| <!-- AGENT: 来源 --> | <!-- AGENT: 触发 --> | <!-- AGENT: 目标 --> | <!-- AGENT: 条件 --> |

---

## 4. 模态框清单 | Modal Inventory

<!-- AGENT: 列出所有模态框/弹层。 -->

| # | 模态框 Modal | 触发页面 Trigger Page | 用途 Purpose |
|---|---|---|---|
| 1 | <!-- AGENT: 如 "创建确认弹窗" --> | <!-- AGENT: 如 "列表页" --> | <!-- AGENT: 如 "确认删除操作" --> |
| 2 | <!-- AGENT: 如 "表单弹窗" --> | <!-- AGENT: 如 "详情页" --> | <!-- AGENT: 如 "快速编辑" --> |

---

## 4.1 页面与弹窗统计 | Page and Modal Counts

<!-- AGENT: 给出页面和模态框总数，方便快速核对范围。 -->

- **页面总数 Total Pages**: <!-- AGENT: 数量 -->
- **弹窗总数 Total Modals**: <!-- AGENT: 数量 -->

---

## 5. 核心交互规范 | Core Interaction Patterns

<!-- AGENT: 定义关键交互规范。至少 3 个。 -->

### 5.1 表单交互 | Form Interactions

- **提交反馈**: <!-- AGENT: 如 "按钮显示 loading 状态，成功后 toast 提示" -->
- **验证时机**: <!-- AGENT: 如 "失焦验证，实时验证仅用于格式检查" -->
- **错误展示**: <!-- AGENT: 如 "字段下方红色文字，支持屏幕阅读器" -->

### 5.2 列表交互 | List Interactions

- **分页**: <!-- AGENT: 如 "每页 20 条，显示总数" -->
- **筛选**: <!-- AGENT: 如 "侧边栏筛选，实时更新" -->
- **排序**: <!-- AGENT: 如 "点击表头排序" -->

### 5.3 状态反馈 | State Feedback

- **加载状态**: <!-- AGENT: 如 "骨架屏优先，spinner 用于短加载" -->
- **空状态**: <!-- AGENT: 如 "显示引导插图和操作按钮" -->
- **错误状态**: <!-- AGENT: 如 "显示错误信息和重试按钮" -->

---

## 6. 响应式策略 | Responsive Strategy

<!-- AGENT: 从 PRD.md 2.1 用户角色和面试结果推导响应式需求。 -->

| 断点 Breakpoint | 宽度 Width | 布局 Layout |
|---|---|---|
| 桌面 Desktop | <!-- AGENT: 如 "≥1024px" --> | <!-- AGENT: 如 "侧边栏 + 主内容" --> |
| 平板 Tablet | <!-- AGENT: 如 "768-1023px" --> | <!-- AGENT: 如 "折叠侧边栏" --> |
| 手机 Mobile | <!-- AGENT: 如 "<768px" --> | <!-- AGENT: 如 "底部导航" --> |

---

## 7. 页面覆盖率检查 | Page Coverage Check

<!-- AGENT: 检查页面是否覆盖所有核心场景。 -->

| 核心场景 Core Scenario | 覆盖页面 Covered Page | 状态 Status |
|---|---|---|
| <!-- AGENT: 场景 1 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |
| <!-- AGENT: 场景 2 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |
| <!-- AGENT: 场景 3 --> | <!-- AGENT: 页面名 --> | ✅ 已覆盖 |

---

## 文档间契约 | Downstream Contracts

- `PRODUCT-DESIGN.md` 必须继承本文档的页面清单和交互规范。
- `.page-coverage.json` 必须记录页面覆盖率。
- 下游 `04-设计规范.md` 必须继承本文档的设计系统。
- 下游 `05-页面流程.md` 必须继承本文档的页面关系树。

---

## Agent 生成检查表 | Agent Completion Checklist

- [ ] 有设计系统定义（色彩、排版、间距）
- [ ] 有页面清单（至少覆盖所有核心场景）
- [ ] 有页面关系树（Mermaid）
- [ ] 有至少 3 个交互规范
- [ ] 有页面覆盖率检查
- [ ] 零 `[placeholder]` 残留
