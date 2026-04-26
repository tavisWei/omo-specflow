---
description: Shortcut entry for bugfix mode in SpecFlow
argument-hint: <describe the bug and reproduction>
agent: metis
---

# SpecFlow Bugfix — Bugfix 快捷入口 | Bugfix Shortcut

Use this shortcut when the work starts from a defect report.

## 适用场景 | When to Use

- 修复已知 BUG
- 需要围绕复现、根因、修复、验证来工作
- 需要回归测试和证据闭环

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Bugfix**

后续应按缺陷闭环执行：

**Bug Intake / Root Cause → Delta Spec → Tasks → Implement → Test → Complete**

## 建议输入 | Suggested Input

```txt
/sf-bugfix 登录后跳转 500
Steps to reproduce: ...
Expected: ...
Actual: ...
Impact: checkout users blocked
```

## 预期输出 | Expected Outputs

- 缺陷说明
- 根因分析
- Bug TODO
- 修复任务、验证任务、回归任务
- 缺陷验证与回归证据
