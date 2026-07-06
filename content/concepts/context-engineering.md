---
type: concept
title: Context Engineering 是什么
slug: context-engineering
term: Context Engineering
aliases: [上下文工程, 上下文管理]
category: AI 工程化
parent: AI 工程化
summary: Context Engineering 是设计和管理大模型在多轮交互中应该看到什么信息、何时看到、以什么形式看到的系统工程方法。
definition: Context Engineering 是一种围绕大模型上下文窗口进行结构化管理的方法论，它关注如何把稳定的规则、动态的任务状态和实时的对话指令分层组织，使模型在每次调用时以最低的 token 成本恢复到最佳工作状态。
not: 它不等于 Prompt Engineering——Prompt Engineering 解决"这一轮该怎么说"，Context Engineering 解决"模型在整个工作周期里应该看到什么"；也不等于简单地把所有信息塞进上下文窗口。
scenarios: [Vibe Coding 项目的三层文件上下文管理, 企业级 Agent 多轮对话的状态持久化, 多 Agent 系统中的上下文隔离与传递, 长周期知识库项目的上下文恢复]
misconceptions: [把上下文管理等同于"多给模型一些背景信息", 忽略可缓存与不可缓存的上下文分层导致成本翻倍, 频繁修改系统级指令导致 Prompt Caching 失效, 认为上下文窗口越大就越不需要上下文工程]
tags: [AI, 上下文, Context, Vibe Coding]
relatedConcepts: [prompt-engineer, loop-engineering, harness-engineer, vibe-coding, spec-driven-development]
relatedArticles: []
projects: []
updated: 2026-07-06
language: zh-CN
citation: Context Engineering 的核心是把上下文分为可缓存的稳定层和不可缓存的动态层，用文件系统持久化，让 AI 在每次新对话里以最少的 token 恢复到最佳工作状态。
---

## 更完整的解释

当模型从单轮对话走向多轮协作、从一次性问答走向长周期项目时，最大的挑战不是模型不够聪明，而是"失忆"——长对话贵，短对话忘。

Context Engineering 的核心矛盾是：每次发一条消息，AI 都要把整个上下文重新处理一遍，长对话的 token 消耗是前期的 3-5 倍；但如果开新对话来"重置"上下文，所有项目背景、技术栈、当前任务都要重新喂一遍。

解法是把上下文分层持久化到文件系统中：

- **项目级（README.md）**：稳定概述——这是什么项目、用什么技术栈、有什么规矩
- **任务级（TODO.md）**：动态状态——当前做到哪了、下一步做什么、有哪些 bug
- **对话级（CLAUDE.md）**：系统指令——写代码的规矩、测试要求、协作流程

这三层不是随意分类，而是围绕 Prompt Caching 的经济学做的架构设计。可缓存的部分（CLAUDE.md + README.md）内容稳定、几乎不改，被 AI 作为 System Prompt 读取，享受缓存命中，处理成本降低 60-80%。不可缓存的部分（TODO.md + 当前对话）内容动态频繁更新，但内容量小，成本可控。

**关键判断：CLAUDE.md 是宪法，改一次要全民公投；TODO.md 是日程表，每天都可以划掉几项。别把日程表写进宪法里。** 把动态任务状态写进系统级指令会导致 Prompt Caching 失效，成本翻倍。

Context Engineering 是 AI 工程化演进的第二阶段——从 Prompt 工程（怎么跟模型说）到 Context 工程（模型应该看到什么），再到 Harness 工程（模型以外的所有能力），最后到 Loop 工程（系统如何自动迭代）。

## 例子

在 Vibe Coding 项目中，开发者每次开新对话时，AI 自动读取三个文件：

1. `README.md` → 知道这是什么项目、用什么技术栈
2. `TODO.md` → 知道当前做到哪了、下一步做什么
3. `CLAUDE.md` → 知道写代码的规矩、测试要求

AI 立刻进入状态，不需要开发者重新介绍。开 100 次新对话，可缓存部分只付一次完整处理费。这就是 Context Engineering 在实践中的样子——三个文件，三层上下文，把"长对话贵、短对话忘"的矛盾用架构设计解决。
