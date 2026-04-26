---
description: Shortcut entry for Brownfield feature iteration in SpecFlow
argument-hint: <describe the incremental feature change>
agent: metis
---

# SpecFlow Iterate — Brownfield Feature 快捷入口 | Brownfield Feature Shortcut

Use this shortcut when you are iterating on an existing project.

## 适用场景 | When to Use

- 现有项目新增功能
- 修改已有模块
- 需要兼容性、影响分析和回归控制

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Brownfield Feature**

后续应以增量方式执行：

**Impact Analysis / Delta Spec → Plan → Tasks → Implement → Test → Complete**

## 建议输入 | Suggested Input

```txt
/sf-iterate 在现有 billing 模块中增加优惠券能力
Affected modules: billing, checkout
Out of scope: reporting
Regression scope: checkout, invoice generation
```

## 预期输出 | Expected Outputs

- 影响分析
- 增量 spec
- 回归计划
- 增量 `.spec/TODO.md` / `.spec/TASKS.md`
- 实现、验证与交付证据
