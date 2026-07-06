---
type: article
title: Loop Engineering：设计模式、工具链与实践案例
slug: loop-engineering-design-patterns
date: 2026-07-06
updated: 2026-07-06
description: 本文是Loop Engineering系列的第三篇，聚焦已有两篇文章未覆盖的内容：认知循环的内部结构、六大设计模式、工具链生态全景、以及真实系统的实践案例。范式演进、五要素、三个工程层级等内容请参见系列前两篇。
source: local
sourceLabel: LOCAL MD
originalUrl:
tags: [Loop Engineering, Agent Loop, 设计模式, 工具链, 框架选型]
concepts: [loop-engineering]
projects: []
featured: false
hot: false
language: zh-CN
---

---

## 核心结论

Loop Engineering不是学术论文里提出来的，是从工程实践中长出来、被社区命名的。

| 要素 | 详情 |
|------|------|
| 命名时间 | 2025年底-2026年初 |
| 关键人物 | Boris Cherny（Anthropic Claude Code创建者）、Addy Osmani（Google工程师）、Rahul（@sairahul1） |
| 标志性事件 | Boris Cherny金句"my job is to write loops"引爆传播；Addy Osmani博客正式命名；Rahul发表《Loops: What Every AI Engineer Needs to Know in 2026》系统化阐述 |

Addy Osmani给出了最精确的一句话定义：

> "Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead."

——循环工程就是把你这个"提示agent的人"替换掉，你设计那个替你做这件事的系统。

Davide Gallitelli（AWS）补充了一个关键判断：四层范式（Prompt → Context → Harness → Loop）是**嵌套包含**关系，不是替代关系。这个判断后来被广泛引用，成为理解范式演进的基础框架。

---

## 二、五阶段认知循环：Agent Loop的内部结构

前面两篇文章讲了循环的"五块积木"（Goal、Tools、Memory、Verifier、Stop Condition），那是从工程师视角看循环需要什么。这里补上另一个视角：**从Agent内部看，一轮循环到底发生了什么。**

五阶段模型：

```
1. PERCEIVE（感知）→ 接收目标/工具反馈，组装上下文
2. REASON（推理）→ LLM推理，评估当前状态与目标差距
3. PLAN（规划）→ 分解目标为可执行步骤，排序、分配工具
4. ACT（执行）→ 调用工具（代码执行、文件操作、搜索等）
5. VERIFY（验证）→ 检查结果是否满足终止条件，失败则反思回到感知
```

这五步构成一个闭环：感知→推理→规划→执行→验证→（不满足则）反思→感知→……

关键理解：**REASON和PLAN是分开的两步。** 很多简化的Agent实现把推理和规划混在一起，但成熟的设计会显式分离——先评估"现在在哪、离目标多远"（推理），再决定"下一步做什么、用什么工具"（规划）。分离的好处是规划可以独立优化和缓存，不必每次推理都重新规划。

VERIFY阶段是循环的转向开关。通过验证则终止循环，不通过则进入反思——把失败原因注入记忆，回到感知阶段重新组装上下文。这个"反思→注入记忆"的机制是Agent能从错误中学习的核心。

---

## 三、六大设计模式

循环不是一种模式，是一族模式。以下六种是当前工程实践中最常见的。

### 模式1：ReAct（Reason + Act）— 基础循环

感知→推理→行动→观察→循环。这是最基础的Agent Loop模式，2022年提出（ICLR 2023发表），几乎所有Agent框架的默认实现。

适用场景：通用任务、简单工具调用。不适用于需要深度反思或复杂规划的场景。

**ReAct是Loop Engineering的组件，不是Loop Engineering本身。** ReAct解决"Agent怎么想"，Loop Engineering解决"人怎么设计让Agent自主跑的系统"。同一个循环，ReAct是引擎内部的运转方式，Loop Engineering是引擎的设计图纸。

### 模式2：Reflexion（自反思循环）

Actor生成输出 → Evaluator评分 → Self-Reflector生成语言反思 → 注入记忆 → 下一轮。

与ReAct的区别：Reflexion引入了显式的反思环节。Agent不只是"观察结果然后继续"，而是对失败进行语言层面的归因分析，把反思结论写入记忆，指导下一轮改进。

关键特点：**不更新模型权重，通过语言反馈强化Agent。** 这意味着不需要微调模型，只需要设计好评 evaluator 和反思引导prompt。

适用场景：需要从失败中学习的迭代任务，如代码生成、论文写作、数学推理。

参考：arXiv:2303.11366（Reflexion论文）。

### 模式3：Maker-Checker（双Agent验证）

一个Agent创建解决方案，另一个独立Agent验证。验证Agent使用不同prompt/不同模型，避免自我确认偏差。

与Reflexion的区别：Reflexion是同一个Agent自我反思，Maker-Checker是两个独立Agent交叉验证。后者更可靠——创造者和验证者的"视角"不同，更可能发现问题。

适用场景：高可靠性要求的任务，如安全审计、代码审查、关键决策。生产环境中，Maker和Checker应使用不同模型，进一步降低同质化偏差。

### 模式4：Plan-Then-Execute（先规划后执行）

先完整分解目标为步骤序列，再逐步执行。

与ReAct的区别：ReAct是"走一步看一步"，每轮都重新推理；Plan-Then-Execute是"先想清楚全盘计划再动手"。前者灵活但可能缺乏全局视野，后者有全局规划但计划可能因执行中的意外而失效。

适用场景：长周期复杂任务，如多文件代码重构、多步骤数据处理流水线。实践中常与ReAct混合使用——外层Plan-Then-Execute定框架，内层每步用ReAct执行。

### 模式5：Budget Circuit Breaker（预算断路器）

设置硬预算上限（token数/美元/迭代次数），超出时终止循环或降级为人工接管。

这不是一个独立的循环模式，而是叠加在任何循环上的安全层。生产环境必需——没有成本边界的自主系统一定会撞上成本墙。

设计要点：预算不是单一阈值，应该是分层梯度。例如：50%预算时发出警告，80%时降级模型（从大模型切到小模型），100%时终止或转人工。这样在成本可控的同时尽可能完成任务。

### 模式6：Human-in-the-Loop Gate（人工审批门）

在关键步骤前插入人工确认节点。适用于高风险操作（如生产环境部署、资金操作、不可逆操作）。

设计要点：审批门不是"每步都问人"——那退化回了手动模式。而是在循环中标记"关键决策点"，只在关键点暂停。关键是设计好什么算"关键"——通常是不可逆操作、高影响范围操作、或Agent置信度低于阈值的决策。

---

## 四、工具链生态：七层架构

Loop Engineering不是只有一个框架，而是一个完整的工具栈。从底到顶七层：

```
Layer 7: 可观测性 & 评估（Langfuse / LangSmith / Coze Loop / Arize）
Layer 6: 安全 & 护栏（预算断路器 / Kill Switch / Guardrails）
Layer 5: 记忆 & 状态管理（Mem0 / LangGraph Checkpoints）
Layer 4: 循环编排框架（LangGraph / CrewAI / AutoGen / OpenAI Agents SDK）
Layer 3: Agent Loop引擎（ReAct / Reflexion / Maker-Checker / Plan-Execute）
Layer 2: 工具协议层（MCP / Function Calling）
Layer 1: LLM推理层（GPT / Claude / Gemini / Llama / 本地模型）
```

从下往上读：Layer 1是模型本身的能力，Layer 2让模型能调用外部工具，Layer 3是循环的运转模式，Layer 4是编排这些循环的框架，Layer 5管理跨循环的状态，Layer 6提供安全边界，Layer 7让你看到循环在做什么、做得怎么样。

**大多数团队卡在Layer 3-4之间。** 能跑ReAct循环的demo很多，但能做状态持久化、预算控制、可观测性的生产系统很少。从Layer 3到Layer 4-5-6-7的跨越，正是从"玩具"到"生产"的跨越。

### 关键框架对比

| 框架 | 循环支持 | 适用场景 | 地位 |
|------|---------|---------|------|
| **LangGraph** | 原生支持循环、检查点、状态持久化、回溯 | 复杂多Agent系统、生产级部署 | 2026年首选 |
| CrewAI | 支持循环任务分配 | 团队协作模拟 | |
| AutoGen / AG2 | 支持对话循环 | 研究原型 | |
| OpenAI Agents SDK | 内置agent loop | 快速原型 | |
| Claude Agent SDK | 原生agent loop | Claude生态 | |

LangGraph在2026年成为首选的原因：原生支持循环图（不只是DAG）、检查点机制（崩溃恢复）、状态持久化（跨循环记忆）、以及回溯能力（从错误状态回退）。这些恰好是L2-L3层级循环的核心需求。

### 开源项目

| 项目 | 描述 |
|------|------|
| cobusgreyling/loop-engineering | 循环工程模式与CLI工具 |
| coze-dev/coze-loop | 字节跳动Agent全生命周期优化 |
| bytedance/deer-flow | 长周期Agent编排 |
| OpenHands | 开源自主编程Agent（原OpenDevin） |
| ai-boost/awesome-harness-engineering | Agent harness工程资源大全 |

---

## 五、实践案例：真实系统的循环长什么样

### Claude Code

循环：运行shell命令 → 编辑文件 → 调用外部服务 → 测试验证 → 自纠错。

Claude Code是Loop Engineering理念的标杆实现——Boris Cherny（其创建者）说的"my job is to write loops"不是抽象口号，而是对Claude Code设计哲学的直接描述。被学术论文分析（arXiv:2604.14228）。

### OpenHands（原OpenDevin）

循环：规划 → 编码 → 测试 → 修复（Plan-Code-Test-Fix Loop）。

特点：云端沙箱执行 + Agent循环引擎分离。执行环境和循环逻辑解耦，使得循环可以在安全沙箱中自由运行而不影响宿主系统。

### GitHub Copilot Agent Loop

每次迭代 = 一次LLM API调用，对应turn_start/turn_end事件对。这是最"轻量"的循环实现——没有复杂的状态管理，靠事件流来追踪循环进度。适合轻量级IDE集成场景。

### DeerFlow（字节跳动）

长周期Agent编排：探索 → 分析 → 综合 → 验证 → 深化。

与Claude Code等编码场景的区别：DeerFlow的循环面向信息收集和深度研究，不是代码生成。每一轮循环的"深化"阶段会基于前几轮的发现，决定是否需要进一步探索——这是一种自适应深度的循环设计。

### Google ADK LoopAgent

生成 → 验证 → 若不通过 → 反思修正 → 重新生成。

Google ADK（Agent Development Kit）的LoopAgent是Maker-Checker模式的官方实现：生成Agent产出内容，验证Agent检查质量，不通过则触发反思和重新生成。这是大厂框架内建Loop Engineering支持的信号。

---

## 六、行业评价：不只是技术圈在讨论

Loop Engineering已经溢出技术圈，进入主流商业媒体视野：

| 来源 | 评价 |
|------|------|
| Business Insider | "Forget Prompts: 'Loop Engineering' Is All the Rage Now" |
| The New Stack | 称其为"orchestration pattern"，Boris Cherny从内部验证了方向 |
| O'Reilly | 作为正式技术趋势报道 |
| Anthropic 2026报告 | 工程师角色从"实现者"转向"编排者" |
| dev.to | 引用数据称带来"13+百分点的改进" |
| HuggingFace | 已收录awesome-loop-engineering数据集 |

批评声音同样存在，且同样来自主流媒体：

| 来源 | 评价 |
|------|------|
| The Register | "Loop engineering, latest AI buzzword, still needs humans in the loop" |
| Reddit r/ClaudeCode | "loop engineering === psyop"，多层嵌套复杂度失控 |
| Reddit r/AgentsOfAI | "The loop engineering trend is a financial nightmare"——token成本灾难 |
| Medium (Sudarshan Koirala) | "有用的模式，但营销已跑在证据前面" |
| itsplaitime.com | "Loop Engineering Sounds Smart. The Bill Says Otherwise" |

五大争议点（前三个已在系列前两篇文章详细回应，这里补充后两个）：

1. **真范式转变还是新流行语？** → 见前文回应
2. **Token成本** → 见前文回应
3. **"认知投降"风险** → 见前文回应
4. **仍需人类在环**：完全自主的Agent循环在生产环境中尚不可靠。这不是否定Loop Engineering，而是说明L3层级的Human-in-the-Loop Gate不是可选项——在当前技术成熟度下，它是生产部署的必要组件。
5. **适用条件受限**：只在稳定可重复任务、干净测试环境、明确停止条件下有效。这意味着Loop Engineering不是万能的——对于探索性任务、模糊目标、或无法定义验证标准的场景，传统的人驱方式仍然更合适。

---

## 七、趋势判断

### 已确认的趋势

1. ✅ Prompt Engineer作为独立角色已死（行业广泛共识，LinkedIn/Amazon AZ-102/Medium多源一致）
2. ✅ 工程师角色从编码者转向编排者（Anthropic报告+多家分析机构一致）
3. ✅ 循环而非提示词成为AI工程的基本单位
4. ✅ SDD + Loop Engineering正在融合（GitHub spec-kit已有正式Issue要求集成）

### 存疑

1. ⚠️ Loop Engineering是否能成为持久范式——目前证据以案例和观点为主，缺乏大规模实证研究
2. ⚠️ Token经济可持续性——自主循环的高成本能否在生产环境中scale
3. ⚠️ 是否只是命名通胀——核心概念（Agent Loop、ReAct）早已存在

### 预测

- **短期（2026）**：作为概念框架被广泛采纳，实践者需自行摸索
- **中期（2027）**：工具链成熟（spec-kit集成、CI/CD for Agent Loops），最佳实践固化
- **长期**：可能被更高级抽象（如Multi-Agent Orchestration）包裹

### 最大风险

如果完全自主Agent循环在生产环境中频繁失败（成本爆炸、不可调试、安全事件），行业可能回调到"human-in-the-loop"混合模式，Loop Engineering的"完全自主"愿景将被打折。但即使回调，Loop设计仍是核心技能——只是自主度降低，人介入的频率升高。

---

## 参考来源

- Business Insider, The New Stack, The Register, O'Reilly
- Anthropic 2026 Agentic Coding Trends Report
- Addy Osmani Blog/Substack
- LangChain State of Agent Engineering Report
- Sourcegraph Context Engineering Guide
- GitHub spec-kit Issue #2977
- HuggingFace awesome-loop-engineering
- arXiv:2604.14228（Claude Code学术论文）
- arXiv:2303.11366（Reflexion论文）
- Gartner 2026预测
- 30+行业媒体和社区来源
