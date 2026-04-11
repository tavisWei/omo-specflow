#!/bin/bash
# OMO-SpecFlow 一键安装脚本
# OMO-SpecFlow One-Click Installation Script

set -e

echo "🚀 OMO-SpecFlow 安装器"
echo "=============================="

# 检测安装方式
INSTALL_MODE="global"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            INSTALL_MODE="project"
            shift
            ;;
        --help)
            echo "用法: $0 [--project]"
            echo ""
            echo "选项:"
            echo "  --project   安装到当前项目而不是全局"
            echo "  --help      显示此帮助信息"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$INSTALL_MODE" = "global" ]; then
    echo "📦 全局安装模式"
    echo ""

    # 创建目录
    echo "📁 创建配置目录..."
    mkdir -p ~/.config/opencode/skills
    mkdir -p ~/.config/opencode/commands
    mkdir -p ~/.config/opencode/spec-templates

    # 安装 Hook
    echo "⚙️  安装 Hook..."
    rm -rf ~/.config/opencode/skills/omo-specflow
    cp -r "$SCRIPT_DIR/.opencode/hooks/omo-specflow" ~/.config/opencode/skills/

    # 安装命令
    echo "⚡ 安装命令..."
    cp "$SCRIPT_DIR/.opencode/commands/spec-start.md" ~/.config/opencode/commands/

    # 安装模板
    echo "📄 安装规格模板..."
    rm -rf ~/.config/opencode/spec-templates/*
    cp -r "$SCRIPT_DIR/.opencode/spec-templates/"* ~/.config/opencode/spec-templates/

    echo ""
    echo "✅ 全局安装完成!"
    echo ""
    echo "所有项目都可以使用 OMO-SpecFlow 了！"
    echo ""
    echo "快速开始:"
    echo "  1. 在 OMO 中输入: /spec-start"
    echo "  2. 或输入: 我要开发XXX功能"
    echo ""
    echo "模板位置: ~/.config/opencode/spec-templates/"

else
    echo "📦 项目安装模式"
    echo ""

    # 检查是否在 git 项目中
    if [ ! -d ".git" ]; then
        echo "❌ 错误: 当前目录不是 Git 项目"
        echo "请在 Git 项目根目录运行此脚本"
        exit 1
    fi

    # 创建目录
    echo "📁 创建 .opencode 目录..."
    mkdir -p .opencode/hooks
    mkdir -p .opencode/commands
    mkdir -p .opencode/spec-templates

    # 安装 Hook
    echo "⚙️  安装 Hook..."
    rm -rf .opencode/hooks/omo-specflow
    cp -r "$SCRIPT_DIR/.opencode/hooks/omo-specflow" .opencode/hooks/

    # 安装命令
    echo "⚡ 安装命令..."
    cp "$SCRIPT_DIR/.opencode/commands/spec-start.md" .opencode/commands/

    # 安装模板
    echo "📄 安装规格模板..."
    rm -rf .opencode/spec-templates/*
    cp -r "$SCRIPT_DIR/.opencode/spec-templates/"* .opencode/spec-templates/

    echo ""
    echo "✅ 项目安装完成!"
    echo ""
    echo "在项目中可以使用 OMO-SpecFlow 了！"
fi

echo ""
echo "=============================="
echo "🎉 安装成功!"
