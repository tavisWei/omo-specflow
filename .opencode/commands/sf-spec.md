---
description: Shortcut entry for Direct-Spec mode in SpecFlow
argument-hint: <prd/prototype links or requirement summary>
agent: metis
---

# SpecFlow Spec — Direct-Spec 快捷入口 | Direct-Spec Shortcut

Use this shortcut when you already have clear requirements and prototype materials.

## 适用场景 | When to Use

- 已有 PRD 或需求说明
- 已有原型图、Figma、页面截图或设计稿
- 想快速进入 spec → todo → tasks
- 现有需求文档和原型图只有核心部分，需要补全完整 PRD、页面清单和缺失页面说明

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Direct-Spec**

后续应从 **Architecture / Design 对齐** 切入，再进入：

**Constitution → Specify → Plan → Tasks → Implement → Test → Complete**

如果现有 PRD / 原型材料不完整，则先补最小必要的上游缺口：

- **最小必要缺口** = 让现有材料足以生成 `SPEC.md`、`TODO.md`、`TASKS.md` 所缺的最少内容；不新增未被原始需求、原型、菜单或页面说明暗示的功能或页面

- 补齐 `.spec/PRD.md` 的缺失章节
- 补齐 `.spec/UIUX.md` 的页面清单、页面关系树和设计系统锚点
- 补齐 `.spec/PRODUCT-DESIGN.md` 的缺失页面功能详情
- 生成 `.spec/.page-coverage.json`，确保需求和菜单中提到的页面都有承接

## 建议输入 | Suggested Input

```txt
/sf-spec
PRD: https://...
Prototype: https://...
Constraints: Next.js + PostgreSQL, only P0 scope in this iteration
```

### 不完整 PRD / 部分原型建议输入 | Suggested Input for Incomplete PRD / Partial Prototype

```txt
/sf-spec
PRD: <需求文档链接或摘要>
Prototype: <Figma / 截图 / 原型链接>
Known gaps:
- 需求文档只覆盖核心需求
- 原型只有部分核心页面
- 菜单或需求提到的功能尚无页面原型
Style anchors:
- <作为风格锚点的现有页面 1>
- <作为风格锚点的现有页面 2>
Missing pages:
- <待补全页面 1>
- <待补全页面 2>
Consistency requirements:
- 新增页面需与现有原型在色彩、间距、组件层级和交互方式上保持一致
```

## 预期输出 | Expected Outputs

- 对齐后的架构/设计文档
- `.spec/SPEC.md`
- `.spec/TODO.md`
- `.spec/TASKS.md`
- 实现、联调、回归与交付证据
- 如输入材料不完整：额外输出补全后的 `PRD.md`、`UIUX.md`、`PRODUCT-DESIGN.md` 与页面覆盖缺口结论
