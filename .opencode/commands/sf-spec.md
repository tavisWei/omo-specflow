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

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Direct-Spec**

后续应从 **Architecture / Design 对齐** 切入，再进入：

**Constitution → Specify → Plan → Tasks → Implement → Test → Complete**

## 建议输入 | Suggested Input

```txt
/sf-spec
PRD: https://...
Prototype: https://...
Constraints: Next.js + PostgreSQL, only P0 scope in this iteration
```

## 预期输出 | Expected Outputs

- 对齐后的架构/设计文档
- `.spec/SPEC.md`
- `.spec/TODO.md`
- `.spec/TASKS.md`
- 实现、联调、回归与交付证据
