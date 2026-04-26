# Design 阶段 Agent 指令 | Design Phase Instructions

> Agent 在 Design 阶段的完整行为规范：UIUX 对齐和产品设计。

---

## 阶段定位 | Phase Position

**Design** 是上游文档链的第三个阶段，在 Architecture 之后、Constitution 之前执行。

```
Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Complete
```

---

## 输入 | Input

- `.spec/PRD.md` — 产品需求文档
- `.spec/ARCHITECTURE.md` — 架构推荐文档

---

## 输出 | Output

- `.spec/UIUX.md` — UIUX 对齐文档
- `.spec/PRODUCT-DESIGN.md` — 产品设计文档
- `.spec/.page-coverage.json` — 页面覆盖率报告

---

## 子阶段 1：UIUX 对齐 | UIUX Alignment

### 步骤 1.1：定义设计系统

**行为**:
1. 从 PRD.md 产品定位推导品牌气质
2. 定义色彩规范（主色、成功、警告、错误、背景、文字）
3. 定义排版规范（H1/H2/正文/小字）
4. 定义间距规范（基础单位、常用间距）
5. 从 ARCHITECTURE.md 确认组件库

### 步骤 1.2：生成页面清单

**行为**:
1. 从 PRD.md 核心场景推导页面列表
2. 为每个页面定义：路由、角色、场景
3. 确保覆盖所有核心场景

### 步骤 1.3：绘制页面关系树

**行为**:
1. 用 Mermaid flowchart 描述页面导航关系
2. 标注主要导航路径
3. 标注认证边界（需登录/公开）

### 步骤 1.4：定义交互规范

**行为**:
1. 定义表单交互（提交反馈、验证时机、错误展示）
2. 定义列表交互（分页、筛选、排序）
3. 定义状态反馈（加载、空状态、错误状态）

### 步骤 1.5：页面覆盖率检查

**行为**:
1. 检查页面是否覆盖所有核心场景
2. 生成覆盖率报告

---

## 子阶段 2：产品设计 | Product Design

### 步骤 2.1：页面功能详情

**行为**:
1. 为 UIUX.md 中的每个页面生成详细功能描述：
   - 基本信息（路由、角色、场景）
   - 功能点列表
   - 数据字段定义
   - 交互状态（加载/成功/错误/空）
   - 错误处理

### 步骤 2.2：页面-功能映射

**行为**:
1. 检查所有 P0 功能是否都有对应页面
2. 生成映射表

### 步骤 2.3：数据模型对齐

**行为**:
1. 检查页面数据字段与 ARCHITECTURE.md 数据模型是否一致
2. 如有差异，说明原因或建议补充

### 步骤 2.4：验收标准汇总

**行为**:
1. 为每个页面生成验收标准
2. 定义测试方式

### 步骤 2.5：生成覆盖率报告

**行为**:
1. 生成 `.spec/.page-coverage.json`
2. 包含：总页面数、已覆盖场景数、覆盖率百分比

---

## 质量标准 | Quality Standards

| 指标 | 要求 |
|---|---|
| 设计系统完整性 | 色彩、排版、间距全部定义 |
| 页面清单完整性 | 覆盖所有核心场景 |
| 页面关系树 | Mermaid 格式有效 |
| 交互规范数量 | ≥3 个 |
| 数据模型一致性 | 与 ARCHITECTURE.md 对齐 |
| 验收标准 | 每个页面有 ≥1 条 |

---

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("design")` 必须返回 `{ valid: true }`：
- `.spec/UIUX.md` 存在且包含设计系统、页面清单、页面关系树
- `.spec/PRODUCT-DESIGN.md` 存在且包含所有页面的功能详情
- `.spec/.page-coverage.json` 存在
- 页面覆盖率 ≥90%

---

## 质量门控 | Quality Gate

| 检查项 Check | 通过标准 Pass Criteria |
|---|---|
| 设计系统 | 色彩、排版、间距已定义 |
| 页面清单 | 覆盖所有核心场景 |
| 页面关系树 | Mermaid 有效 |
| 交互规范 | ≥3 个 |
| 数据模型对齐 | 无冲突 |
| 页面覆盖率 | ≥90% |

---

## 禁止事项 | Must NOT Do

- 不要跳过页面覆盖率检查
- 不要定义与 ARCHITECTURE.md 冲突的数据字段
- 不要遗漏核心场景对应的页面
- 不要生成空的交互规范

---

## 自检清单 | Self-Check Checklist

- [ ] 设计系统已定义（色彩、排版、间距）
- [ ] 页面清单已生成
- [ ] 页面关系树已绘制
- [ ] 交互规范已定义（≥3 个）
- [ ] 所有页面有功能详情
- [ ] P0 功能全部有页面覆盖
- [ ] 数据字段与架构对齐
- [ ] 每个页面有验收标准
- [ ] .page-coverage.json 已生成

---

## 示例输出结构 | Example Output Structure

### UIUX.md

```markdown
# UIUX 对齐文档

## 1. 设计系统
### 1.1 品牌气质
### 1.2 色彩规范
### 1.3 排版规范
### 1.4 间距规范
### 1.5 组件库

## 2. 页面清单

## 3. 页面关系树

## 4. 模态框清单

## 5. 核心交互规范

## 6. 响应式策略

## 7. 页面覆盖率检查
```

### PRODUCT-DESIGN.md

```markdown
# 产品设计文档

## 1. 页面功能详情
### 1.1 页面 A
### 1.2 页面 B

## 2. 页面-功能映射

## 3. 数据模型对齐

## 4. 验收标准汇总

## 5. 页面覆盖率报告
```

### .page-coverage.json

```json
{
  "totalPages": 5,
  "coveredScenarios": 3,
  "totalScenarios": 3,
  "coverage": "100%",
  "pages": [
    { "name": "登录页", "route": "/login", "scenarios": ["场景 1"] },
    { "name": "仪表盘", "route": "/dashboard", "scenarios": ["场景 2"] }
  ]
}
```
