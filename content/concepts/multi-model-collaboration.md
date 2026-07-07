---
type: concept
title: 多模型协作 是什么
slug: multi-model-collaboration
term: Multi-Model Collaboration
aliases: [多模型协作, MoA, Mixture of Agents, 多模型编排]
category: AI 工程化
parent: AI 工程化
summary: 多模型协作是让多个AI模型分工配合完成同一任务——不同模型各司其职，通过路由、并行、审校等编排策略组合输出，效果超越任何单模型。2026年已从论文走向产品化。
definition: 多模型协作是指让多个AI模型（可以跨厂商或同厂商不同型号）分工配合完成同一任务的架构模式。核心是通过路由策略将任务分发给最合适的模型，再通过汇总、审校、投票等机制整合输出。Mixture-of-Agents(MoA)是其学术原型，2026年已被微软Copilot Cowork、Manus等产品化。
not: 它不是Agent编排（agent-orchestration）——编排偏通用调度（谁做什么任务），多模型协作特指哪个模型做什么以及怎么组合输出；不是简单的模型集成（ensemble）——集成是统计聚合，多模型协作有明确的分工策略和交互逻辑；不是模型路由的替代——路由是多模型协作的实现手段之一。
scenarios: [跨厂商协作——GPT写初稿Claude审校的微软Copilot Cowork模式, 单厂商多Agent——Anthropic的Opus主控Sonnet执行Orchestrator-Worker模式, 开源框架组合——Hermes Agent的MoA让用户自由组合任意厂商模型]
misconceptions: [认为多模型协作就是选最强模型——实质是各模型比较优势的组合，GPT擅长结构化写作Claude擅长事实核查的组合效果优于任一单模型, 认为协作总比单模型好——token消耗是单次对话15倍，只适合高价值任务不适合日常问答, 认为任意组合都能产生协同——组合错了还不如单模型，路由策略质量取决于场景理解]
tags: [AI, 多模型协作, MoA, Agent编排, 模型路由]
relatedConcepts: [agent-orchestration, orchestration-moat, loop-engineering]
relatedArticles: []
projects: []
updated: 2026-07-07
language: zh-CN
citation: 多模型协作的本质不是"选最强模型"而是"组合各模型的长板"——GPT单独42.7分Claude单独43.3分，协作后57.4分，提升不是线性的是质的飞跃，因为不同模型的比较优势互补了彼此盲区。
---

## 更完整的解释

### 三条技术路线

2026年多模型协作已产品化，按架构分为三条路线：

| 路线 | 核心思路 | 代表平台 |
|------|---------|---------|
| 跨厂商协作 | 让竞争对手的模型互相配合 | 微软 Copilot Cowork、Manus |
| 单厂商多Agent | 同厂商不同型号模型分工协作 | Anthropic、OpenAI GPT-5 Router |
| 开源框架组合 | 用户自由组合任意厂商模型 | Hermes Agent |

### MoA（Mixture of Agents）学术原理

让多个AI模型同时分析问题，然后由一个"汇总模型"整合输出。参考模型层并行执行，汇总模型接收完整上下文+参考模型分析后输出最终结果。HermesBench实测：MoA（Opus + GPT-5.5）得分0.8202，比最强组件模型Opus 4.8单独（0.7607）高约6分，确认多模型聚合提升质量而非简单平均。

### 与Agent编排的区别

| 维度 | Agent编排 | 多模型协作 |
|------|----------|-----------|
| 关注点 | 谁做什么任务（调度） | 哪个模型做什么+怎么组合输出 |
| 本质 | 通用任务调度框架 | 特指多模型的分工与整合策略 |
| 关系 | 多模型协作是Agent编排的一种特化 | Agent编排是多模型协作的上位概念 |

### 关键数据

- GPT单独42.7分 + Claude单独43.3分 → 协作后57.4分（微软DRACO基准）
- Anthropic多Agent系统比单Agent高出90.2%（内部评测）
- token使用量解释了80%的性能差异——多Agent之所以强，本质是让更多token同时工作
- token消耗是单次对话的15倍——协作不是省钱，是花更多钱买更高质量

## 例子

微软Copilot Cowork的Critique模式：GPT写研究报告初稿 → Claude独立做事实核查（检查准确性、引用质量、论证完整度）→ 修订后交付。微软投了OpenAI 130亿美元，却把最终编辑权交给Anthropic的Claude——因为Claude在事实核查维度更强，且"生成者"和"审校者"用不同模型能避免同类盲区。
