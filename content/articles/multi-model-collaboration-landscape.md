---
type: article
title: 多模型协作全景图：六大平台技术架构与最优组合
slug: multi-model-collaboration-landscape
date: 2026-07-06
updated: 2026-07-06
description: 本文是技术地图，回答"多模型协作有哪些做法、各自怎么实现、效果如何"。与之配套的[[编排能力是新护城河-多模型协作的竞争逻辑]]回答"为什么编排能力是护城河"。两文互补：一文是地图，一文是论点。
source: local
sourceLabel: LOCAL MD
originalUrl:
tags: [多模型协作, MoA, Agent编排, 技术全景]
concepts: [multi-model-collaboration, orchestration-moat]
projects: []
featured: false
hot: false
language: zh-CN
---

> 本文是技术地图，回答"多模型协作有哪些做法、各自怎么实现、效果如何"。与之配套的[[编排能力是新护城河-多模型协作的竞争逻辑]]回答"为什么编排能力是护城河"。两文互补：一文是地图，一文是论点。

---

## 核心结论

2026年多模型协作已产品化，按架构分为三条路线：

| 路线 | 核心思路 | 代表平台 |
|------|---------|---------|
| 跨厂商协作 | 让竞争对手的模型互相配合 | 微软 Copilot Cowork、Manus |
| 单厂商多Agent | 同厂商不同型号模型分工协作 | Anthropic、OpenAI GPT-5 Router |
| 开源框架组合 | 用户自由组合任意厂商模型 | Hermes Agent |

国产平台（字节Coze、百度千帆、阿里百炼、智谱GLM）主要走第二条路线，在自家生态内做编排，跨厂商协作能力较弱。

---

## 二、六大平台技术架构详解

### 1. 微软 Copilot Cowork + Researcher：最成熟的跨厂商协作

**上线时间：** 2026年6月16日正式GA（此前在Frontier预览3个月）

**两个核心模式：**

| 模式 | 怎么协作 | 效果 |
|------|---------|------|
| Critique（审校） | GPT写研究报告 → Claude独立事实核查（检查准确性、引用质量、论证完整度）→ 修订后交付 | DRACO基准57.4分，比单模型高13.8% |
| Council（评审会） | 两个模型各写一份独立报告 → 第三个模型写对比信（标注分歧、共识、各自独特洞察） | 能看到两份完整报告+差异分析 |

**关键数据（DRACO研究质量基准）：**

| 系统 | DRACO得分 |
|------|-----------|
| Copilot Researcher + Critique | 57.4 |
| Perplexity Deep Research | 50.4 |
| 单独 Claude Opus 4.6 | 43.3 |
| 单独 GPT o3 | 42.7 |

核心发现：GPT单独42.7分，Claude单独43.3分，但两者协作后57.4分——提升不是线性的，协作产生了质的飞跃。

**使用的模型：** Anthropic Opus 4.8 + Sonnet 4.6（GA版），GPT 5.5（Frontier预览），自研 Cowork 1（即将发布，主打低成本）

**使用门槛：** 需M365 Copilot许可证（$30/人/月）+ Frontier计划 + IT管理员开启第三方模型访问。Copilot Chat → Tools → Researcher → 模型选择器选"Auto"。每月25次查询上限。

---

### 2. Manus：多模型自动路由型Agent

**架构：** 封闭式多模组代理，本身不训练模型，调用现有强大模型的组合。

| 模型 | 用途 |
|------|------|
| Anthropic Claude（Opus / Sonnet） | 高度逻辑推理、复杂规划、主导决策 |
| 阿里 Qwen（通义千问）微调版 | 一般性任务执行、批量处理 |
| GPT 系列 | 部分场景补充 |
| Gemini Flash | 轻量快速任务 |

**路由策略：** 自动为任务每一步挑选最合适的模型——需要深度推理时调Opus级模型，一般性执行用Qwen或Gemini Flash控成本。

**核心功能 Wide Research（广泛研究）：**
- 不是单个Agent顺序处理，而是部署数百个并行独立Agent
- 每个Agent有独立上下文窗口，互不干扰
- 主Agent拆解任务 → 派发子Agent并行执行 → 汇总合成
- 解决传统AI处理超过8-10个项目后质量骤降的问题
- 实测：研究250位AI研究人员、比较100款运动鞋等大规模任务，从第1个到第250个质量始终如一

**代价：** Token消耗是单次对话的15倍，适合高价值任务。

---

### 3. Anthropic Claude：单厂商多Agent研究系统

**架构：Orchestrator-Worker 模式**
- 一个主Agent（Opus 4）负责拆解问题、制定研究策略
- 主Agent派生出多个并行子Agent（Sonnet 4），各自独立搜索不同方向
- 子Agent各自有独立上下文窗口，互不干扰
- 最后主Agent汇总子Agent的发现

**效果：** 比单Agent Claude Opus 4高出90.2%（内部评测）

**代价：** 多Agent系统token消耗是普通对话的15倍

**核心洞察：** Anthropic发现token使用量解释了80%的性能差异——多Agent之所以强，本质是让更多token同时工作。

注意：这是同厂商不同型号模型协作（Opus主控+Sonnet执行），不是跨厂商的。

---

### 4. Hermes Agent / Nous Research：开源框架，三套协作机制

#### 4a. MoA（Mixture of Agents）— 核心多模型协作

**原理：** 让多个AI模型同时分析问题，然后由一个"汇总模型"整合输出。

```
用户问题
    │
    ▼
┌──────────────────────────────────┐
│     参考模型层（并行执行）          │
│  DeepSeek(推理)  GPT-5.5(代码)    │
└──────────┬───────────────────────┘
           ▼
┌──────────────────────────────────┐
│   汇总模型（Claude Opus 4.8）      │
│   整合分析 → 输出最终结果           │
└──────────────────────────────────┘
```

**实测效果（HermesBench基准）：**

| 配置 | 得分 | 提升 |
|------|------|------|
| MoA（Opus + GPT-5.5） | 0.8202 | +8% |
| Claude Opus 4.8 单独 | 0.7607 | 基准 |
| GPT-5.5 单独 | 0.7412 | -2.6% |

MoA比最强组件模型（Opus 4.8）高约6分，确认多模型聚合提升质量而非简单平均。

**关键设计细节：** 参考模型只接收对话文本，不接收系统提示词（省token）；汇总模型接收完整上下文 + 参考模型分析。整个过程对用户透明，像正常对话一样。MoA是虚拟模型provider，选preset就像选普通模型一样，不破坏prompt caching，不改变上下文。

**预设配置示例：**
- 通用协作：DeepSeek V4 Pro + GPT-5.5参考 → Opus 4.8汇总
- 中文优化：Qwen-2.5-72B + GLM-4参考 → Opus 4.8汇总
- 代码专家：GPT-5.5 + DeepSeek-Coder-V3参考 → Opus 4.8汇总

#### 4b. Subagent Delegation（子Agent委派）

**原理：** 主Agent拆解任务 → 派发子Agent并行执行 → 汇总结果。每个子Agent有独立上下文窗口和终端session。

- 单任务委派：`delegate_task(goal="...", context="...")`
- 并行批量：最多3个并发（可配置更高），各自独立工作
- 2026年6月15日升级异步子Agent：委派任务不再阻塞主对话

**多模型能力：** 可在config.yaml给子Agent配置不同模型（如子Agent用Gemini Flash省钱，主Agent用Opus）。

#### 4c. Kanban 看板（多Agent协作板）

**原理：** 持久化SQLite任务看板，跨多个Hermes Profile协作。每个Profile可用不同模型，各自领任务、执行、完成。

适合长周期项目级协作：Profile A（Claude Opus）做架构设计，Profile B（DeepSeek）做代码实现，Profile C（GLM-5.1）做代码审查。

---

### 5. OpenAI GPT-5 Router：模型路由（非协作但相关）

GPT-5引入内部路由器：根据请求复杂度自动在 gpt-5-main（快）、gpt-5-thinking（深度推理）等子模型间切换。

争议：部分用户反馈自动路由质量不稳定，更倾向手动选模型。CNBC报道称模型路由正在成为OpenAI/Anthropic的"成本问题"。

这是自动选择单个最优模型，不是让多个模型协作，但代表了"编排"的另一面——在模型内部做路由。

---

### 6. 国产平台

#### 字节 Coze 扣子 3.0（最接近产品化的国产方案）
- 2026年6月1日上线3.0版本
- "多人+多Agent"协作模式：一人配多Agent、多人配多Agent
- 接入外部Agent框架：Claude Code、Codex CLI、OpenClaw等
- 多模型调度：支持通义/DeepSeek等多模型，用大模型做节点路由
- 多Agent节点路由用专门训练的大模型效果较好，手动设规则路由效果不理想

#### 百度千帆 AppBuilder
- 提供"多智能体协同Agent"模板，可视化拖拽搭建
- 支持工作流编排（对话流、自主规划两种模式）
- 主要基于文心大模型，跨模型协作能力较弱，更多是单模型多Agent

#### 阿里百炼
- Qwen3.7-Max专为Agent场景深度打造，长周期自主执行能力强
- 支持多模型调度（通义/DeepSeek），MCP协议打通系统
- 生态最强，但跨厂商模型协作不如Manus/Coze灵活

#### 智谱 GLM
- 2026年4月发布Agent模型，适配Agent场景
- 面向视觉编程的多模态Coding基座
- 工具调用针对长程多轮Agent工作流做了稳定性优化
- 社区反馈GLM-5.1"执行力比GPT强"

---

## 三、横向对比矩阵

| 平台 | 协作模式 | 跨厂商模型 | 成熟度 | 最擅长 |
|------|---------|-----------|--------|--------|
| 微软 Copilot Cowork | GPT写+Claude审 | ✅ GPT+Claude | ⭐⭐⭐⭐⭐ | 深度研究（准确率最高） |
| Manus | 自动路由+并行Agent | ✅ Claude+Qwen+GPT | ⭐⭐⭐⭐ | 大规模批量任务 |
| Anthropic | Opus主控+Sonnet并行 | ❌ 仅Claude系 | ⭐⭐⭐⭐ | 广度搜索型研究 |
| Hermes Agent | MoA+Delegation+Kanban | ✅ 任意厂商 | ⭐⭐⭐⭐ | 灵活组合，开源可控 |
| 字节 Coze 3.0 | 多人+多Agent编排 | ✅ Qwen+DeepSeek+外部 | ⭐⭐⭐⭐ | 企业业务流程 |
| OpenAI GPT-5 | 内部路由器 | ❌ 仅GPT系 | ⭐⭐⭐ | 快速响应 |
| 百度千帆 | 多智能体协同 | ❌ 主要文心 | ⭐⭐⭐ | 客服/营销标准场景 |
| 阿里百炼 | 多模型调度 | 部分 | ⭐⭐⭐ | 生态内企业应用 |

---

## 四、最优模型组合分析

| 协作组合 | 场景 | 效果 |
|---------|------|------|
| GPT写 + Claude审（微软Critique） | 深度研究 | DRACO 57.4，事实准确性提升最大 |
| GPT-5.5参考 + Opus 4.8汇总（Hermes MoA） | 通用高难度任务 | HermesBench 0.82，比单模型+8% |
| Claude Opus主控 + Claude Sonnet并行（Anthropic） | 广度搜索型研究 | 比单Agent高90.2% |
| Manus（Claude+Qwen+GPT自动路由） | 大规模批量任务 | 100+项目质量始终如一 |
| GPT + Claude各写一份对比（微软Council） | 多视角决策 | 能看到分歧，适合争议话题 |

**核心判断：**
- **Claude Opus 做"汇总/裁判"模型效果最好**——擅长整合多视角信息
- **GPT 擅长代码和结构化写作**，适合做"生成者"
- **DeepSeek 擅长推理**，适合做"参考/分析者"
- GPT和Claude的互补性最强：GPT擅长广度和结构化，Claude擅长严谨推理和事实核查
- 目前验证过的最优组合：**GPT/DeepSeek做参考模型，Opus做汇总**

---

## 五、技术趋势总结

1. **多模型协作已产品化，不是实验室概念。** 微软、Manus、Hermes 都已上线可用的多模型协作功能。

2. **跨厂商协作出乎意料地有效。** GPT和Claude协作的效果远超任一单模型——GPT单独42.7分→Claude审后57.4分，提升不是线性的。

3. **代价明确：Token消耗大幅增加。** 多Agent是单次对话的15倍（Anthropic数据），适合高价值任务。

4. **国产短板：** 缺少像微软Critique那样"让竞争对手的模型互相审校"的大胆设计，更多是在自家生态内做编排。字节Coze 3.0最接近国际思路。

5. **开源优势：** Hermes Agent的MoA让用户自由组合任意厂商模型，灵活性最强，但需要用户自己配API key。

6. **路由策略是关键变量。** 字节Coze的实践表明，用大模型做节点路由效果远好于手动设规则——编排系统本身也需要"编排智能"。

---

> 调研来源：微软官方博客（Copilot Cowork GA公告 2026-06-16）、FindSkill.ai深度分析、Anthropic工程博客、Hermes Agent官方文档、CSDN智能体开发者社区、Manus官方文档、多条社区讨论和实测反馈
