#!/bin/bash

set -e

COMMAND_FILES=(spec-start.md sf-new.md sf-spec.md sf-iterate.md sf-bugfix.md)

echo "🔄 OMO-SpecFlow 更新器"
echo "=============================="

UPDATE_MODE="global"

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            UPDATE_MODE="project"
            shift
            ;;
        --help)
            echo "用法: $0 [--project]"
            echo ""
            echo "选项:"
            echo "  --project   更新当前项目而不是全局"
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$UPDATE_MODE" = "global" ]; then
    echo "🌍 全局更新模式"
    mkdir -p ~/.config/opencode/skills ~/.config/opencode/commands ~/.config/opencode/spec-templates ~/.config/opencode/agent-instructions

    echo "⚙️  更新 Hook..."
    rm -rf ~/.config/opencode/skills/omo-specflow
    cp -r "$SCRIPT_DIR/.opencode/hooks/omo-specflow" ~/.config/opencode/skills/

    echo "⚡ 更新命令..."
    rm -f ~/.config/opencode/commands/spec-start.md ~/.config/opencode/commands/sf-new.md ~/.config/opencode/commands/sf-spec.md ~/.config/opencode/commands/sf-iterate.md ~/.config/opencode/commands/sf-bugfix.md
    for command_file in "${COMMAND_FILES[@]}"; do
        cp "$SCRIPT_DIR/.opencode/commands/$command_file" ~/.config/opencode/commands/
    done

    echo "📄 更新规格模板..."
    rm -rf ~/.config/opencode/spec-templates/*
    cp -r "$SCRIPT_DIR/.opencode/spec-templates/"* ~/.config/opencode/spec-templates/

    echo "🧠 更新 Agent 指令层..."
    rm -rf ~/.config/opencode/agent-instructions/*
    cp -r "$SCRIPT_DIR/.opencode/agent-instructions/"* ~/.config/opencode/agent-instructions/

    echo "✅ 全局更新完成!"
    echo "可用命令: /spec-start /sf-new /sf-spec /sf-iterate /sf-bugfix"
else
    echo "📦 项目更新模式"

    if [ ! -d ".git" ]; then
        echo "❌ 错误: 当前目录不是 Git 项目"
        echo "请在 Git 项目根目录运行此脚本"
        exit 1
    fi

    mkdir -p .opencode/hooks .opencode/commands .opencode/spec-templates .opencode/agent-instructions

    echo "⚙️  更新 Hook..."
    rm -rf .opencode/hooks/omo-specflow
    cp -r "$SCRIPT_DIR/.opencode/hooks/omo-specflow" .opencode/hooks/

    echo "⚡ 更新命令..."
    rm -f .opencode/commands/spec-start.md .opencode/commands/sf-new.md .opencode/commands/sf-spec.md .opencode/commands/sf-iterate.md .opencode/commands/sf-bugfix.md
    for command_file in "${COMMAND_FILES[@]}"; do
        cp "$SCRIPT_DIR/.opencode/commands/$command_file" .opencode/commands/
    done

    echo "📄 更新规格模板..."
    rm -rf .opencode/spec-templates/*
    cp -r "$SCRIPT_DIR/.opencode/spec-templates/"* .opencode/spec-templates/

    echo "🧠 更新 Agent 指令层..."
    rm -rf .opencode/agent-instructions/*
    cp -r "$SCRIPT_DIR/.opencode/agent-instructions/"* .opencode/agent-instructions/

    echo "✅ 项目更新完成!"
fi

echo "=============================="
echo "🎉 更新成功!"
