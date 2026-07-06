---
type: "article"
title: "AI Agent 的反馈循环：Loop Engineering 入门"
slug: "loop-engineering-ai-agent-feedback-loops"
date: "2026-07-05"
updated: "2026-07-05"
description: "Loop Engineering 是一种设计 AI Agent 反馈循环的方法，本文介绍其核心概念、构件和实际应用。"
source: "inbox"
sourceLabel: "INBOX AI"
originalUrl: ""
tags: ["AI 工程化", "Agent", "反馈循环", "工作流"]
concepts: ["loop-engineering", "prompt-engineer", "harness-engineer", "dsl", "geo", "llm-wiki"]
projects: []
featured: false
hot: false
language: "zh-CN"
---

## 核心结论

Loop Engineering 的重点不是让模型“回答得更好”，而是让系统“把工作推进到可验证结果”。它将人的手动提示转化为一套可运行、可检查、可恢复、可停止的工作流。一个好的 loop 应满足：目标清晰、上下文可控、行动可逆、验证可靠、停止明确、角色分离、成本可控、权限最小、状态持久。

## 背景问题

在传统 Prompt Engineering 中，人负责每一轮：写提示词 → 看输出 → 补上下文 → 粘贴错误 → 再提示。这种方式在面对复杂、多步骤任务时效率低下，且难以复用和规模化。随着 AI Agent 的兴起，需要一种系统化的方法来设计 Agent 的行为循环，使其能在最少人工干预下自主推进任务。

## 方法或框架

### 一个基础 Loop 的结构

1. 目标：要完成什么，成功标准是什么。
2. 上下文：当前任务需要哪些代码、文档、历史状态、约束和外部信号。
3. 行动：Agent 可以编辑文件、调用工具、搜索资料、运行测试、打开 PR。
4. 观察：系统读取测试结果、构建日志、diff、链接检查、review comment、用户反馈。
5. 调整：根据观察结果修改计划或下一步动作。
6. 验证：用测试、lint、人工审核、评测集或业务指标判断是否达到标准。
7. 停止：达到成功标准、撞到明确阻塞、超过成本预算、触发风险规则时停止。
8. 记忆：把状态写到文件、issue、Linear、PR、数据库或其他持久层，避免每次从零开始。

### Addy Osmani 的五个构件

- **Automations**：按计划或事件触发发现、分诊和执行。
- **Worktrees**：隔离并行任务，避免多个 agent 互相踩代码。
- **Skills**：把项目知识写成可调用能力。
- **Plugins / Connectors**：接入已有工具和数据源。
- **Sub-agents**：让不同 agent 承担不同角色。
- **Memory**：持久化进展和状态。

### 冲量 AI 网站中的 Loop Engineering 示例

当前个人网站的内容自动化就是一个轻量 Loop Engineering 样例：

```text
用户上传 Markdown/TXT 到 content/inbox/
    ↓
GitHub Actions 触发 AI Inbox workflow
    ↓
脚本读取 Pipeline DSL
    ↓
DeepSeek 按 DSL 拆文章、拆知识点、补 SEO/GEO 字段
    ↓
脚本生成 content/articles、content/concepts 和站点索引
    ↓
自动创建 Pull Request
    ↓
用户审核合并
    ↓
GitHub Pages 自动部署
```

关键控制点包括固定的输入入口、规则、输出契约、验证、审核和记忆。

## 与知识点的关系

- **Prompt Engineering**：Loop Engineering 中 Prompt 仍是核心部件，但关注从单轮设计扩展到多轮系统。
- **Harness Engineering**：提供运行环境，Loop Engineering 在此基础上设计反馈与控制。
- **DSL**：可用于描述 loop 的规则和流程，实现可配置的自动化。
- **GEO**：指导生成的内容结构，使其适合搜索引擎和 AI 引用。
- **LLM Wiki**：提供知识拆解和上下文组织的方法，辅助 loop 中的上下文供给。
