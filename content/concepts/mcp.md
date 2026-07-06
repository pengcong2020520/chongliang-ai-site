---
type: concept
title: MCP / Model Context Protocol 是什么
slug: mcp
term: MCP (Model Context Protocol)
aliases: [模型上下文协议, MCP协议]
category: AI 工程化
parent: AI 工程化
summary: MCP 是 Anthropic 提出的模型上下文协议，为 AI 模型连接外部工具和数据源提供标准化接口，本质是一套治理协议，解决"谁有权做什么"。
definition: MCP 是一种连接 AI 模型与外部工具/数据源的标准化协议，通过 Schema 描述工具能力、权限控制管理访问边界，使不同 AI 工具能对接同一套服务。其本质是治理协议而非效率协议。
not: 它不等于"AI 的万能接口"——MCP 有 Schema 注入的结构性缺陷（每次调用携带全部工具说明），成本远高于 CLI 方案；它也不等于唯一接口标准，在大多数场景下 CLI+Skill 是更经济的选择。
scenarios: [多租户企业级SaaS的授权管理, 金融合规场景的细粒度权限控制, 政府系统需要协议层权限隔离的场景, 团队需要统一工具对接标准的协作环境]
misconceptions: [认为 MCP 是 AI 时代的 USB 接口——"不上 MCP 就是落后", 忽略 Schema 注入的 token 成本（单次调用可达 25,000-44,000 Token）, 以为 MCP 适合所有场景——实际上大多数人不需要企业级权限管理，却在为它的全部成本买单]
tags: [AI, MCP, 协议, 工具调用]
relatedConcepts: [skill, harness-engineer, agent-orchestration, prompt-engineer, agent-harness]
relatedArticles: []
projects: []
updated: 2026-07-06
language: zh-CN
citation: MCP 的本质是一套治理协议，它解决的是"谁有权做什么"而不是"怎么做最快"——大多数人不需要企业级权限管理，却在为它的全部成本买单。
---

## 更完整的解释

2024年 MCP 出现时，整个 AI 圈的反应是——这玩意儿就是 AI 时代的 USB 接口，以后所有工具都能插进来。到 2025 年，MCP Server 在 GitHub 上突破 5000 个，主流 AI 工具全部接入，行业形成共识：不上 MCP 就是落后。

但 2026 年的实践揭示了 MCP 的结构性缺陷。

### MCP 真正解决的问题

MCP 不是没有价值。它真正解决了一个问题——让不同的 AI 工具能对接同一套服务。在企业级场景里，MCP 有原生的权限控制机制——多用户、多租户，各自有各自的访问权限，在协议层就能处理。

**MCP 的本质是一套治理协议，它解决的是"谁有权做什么"，而不是"怎么做最快"。**

### 先天缺陷：Schema 注入

MCP 有一个先天的设计缺陷——Schema 注入。每次 AI 调用 MCP 工具时，它会把这个 Server 上所有工具的"说明书"全部塞进对话上下文里，哪怕你只需要用其中一个。

比如一个 MCP Server 有 43 个工具，你只想问"这个仓库用什么编程语言？"AI 必须先把另外 42 个工具的说明书全读一遍。

基准测试对比：查仓库编程语言，CLI 消耗 1,365 Token，MCP 消耗 44,026 Token——32 倍差距。月运营成本 CLI 是 $3.20，MCP 是 $55.20——17 倍差距。任务成功率 CLI 是 100%，MCP 是 72%。

**这不是 bug，是协议设计决定的。标准化的代价，就是永远要携带全套行李。** 更深的隐患是：AI Agent 越强，单次任务调用工具次数越多，MCP 的 Schema 注入成本就越高——这是一个随 AI 能力增长而持续恶化的结构性缺陷。

### MCP 与 CLI 的关系

CLI 是 AI 的母语——LLM 在训练时消化了全球几十年积累的 CLI 文档、man page、shell 脚本，CLI 语法和常用工具的用法已经被 AI 内化成了直觉。

接口之争的本质，是人类思维习惯和 AI 本能之间的冲突。MCP 是前者，CLI 是后者。MCP 是人类用工程习惯强行给 AI 套了一个外壳。

当 Skill 生态成熟，MCP 的工程价值空间被压缩到唯一一个场景：**多租户企业级授权管理。** 而这，恰恰是绝大多数人根本碰不到的场景。

## 例子

企业 AI 服务平台架构中，工具集成层搭建 Tool Hub，集成底层 MCP、CLI 等工具，实现不同 AI 工具之间的上下文桥接与无缝切换。涉及登录、注册、数据库调用等需要鉴权与权限管控的场景必须使用 MCP 方案。但快速原型开发和个人开发场景，CLI 工具依赖大模型内置的 bash 原生工具调用更高效——无需独立维护 Server，直接可用。
