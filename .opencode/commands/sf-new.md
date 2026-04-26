---
description: Shortcut entry for Greenfield projects in SpecFlow
argument-hint: <describe your new project idea>
agent: metis
---

# SpecFlow New — Greenfield 快捷入口 | Greenfield Shortcut

Use this shortcut when you want to start a brand-new project from 0 to 1.

## 适用场景 | When to Use

- 新项目，从零开始
- 需要完整上游文档链
- 需要从 Discovery 一直走到 Complete

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Greenfield**

后续应继续执行完整流程：

**Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Test → Complete**

## 建议输入 | Suggested Input

```txt
/sf-new 一个面向团队协作的任务管理系统
```

## 预期输出 | Expected Outputs

- 上游文档链
- `.spec/SPEC.md`
- `.spec/TODO.md`
- `.spec/TASKS.md`
- 实现、测试、回归与交付证据
