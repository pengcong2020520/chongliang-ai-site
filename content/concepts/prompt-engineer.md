---
type: concept
title: Prompt Engineer 是什么
slug: prompt-engineer
term: Prompt Engineer
aliases: [提示词工程师, Prompt Engineering, 提示词工程]
category: AI 工程化
parent: AI 工程化
summary: Prompt Engineer 通过任务建模、上下文组织、约束设计和评估迭代，让大模型在具体任务中更稳定地产出结果。
definition: Prompt Engineer 负责设计和迭代模型输入，使大模型在具体任务中更稳定地理解目标、调用上下文、遵守约束并产出可评估结果。
not: 它不只是把提示词写得更漂亮，也不等于会使用几个提示词模板。
scenarios: [复杂任务拆解, 输出格式约束, 多轮上下文组织, 失败样例分析, RAG 或 Agent 的指令层设计]
misconceptions: [把 Prompt Engineer 理解成文案岗位, 只关注单句提示词, 忽略评估和反馈闭环]
tags: [Prompt, LLM, Context]
relatedConcepts: [harness-engineer, dsl, llm-wiki]
relatedArticles: [ai-public-knowledge-system]
projects: []
updated: 2026-07-05
language: zh-CN
citation: Prompt Engineer 的核心不是写提示词，而是把任务、上下文、约束和评估标准组织成模型可执行的输入结构。
---

## 更完整的解释

当模型能力越来越强，失败往往不只来自模型本身，而来自任务没有被清楚表达、上下文没有被正确组织、输出边界没有被约束。

Prompt Engineer 的价值在于把人的模糊意图转化为模型可执行的输入结构。

## 例子

如果一个任务要求模型分析用户反馈，Prompt Engineer 不只是写“请分析反馈”，而是要定义输入字段、分析维度、输出格式、风险边界和判断标准。
