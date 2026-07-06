---
type: "concept"
title: "Loop Engineering 是什么"
slug: "loop-engineering"
term: "Loop Engineering"
aliases: []
category: "AI 工程化"
parent: "AI 工程化"
summary: "Loop Engineering 是围绕 AI Agent 设计可重复运行的反馈系统，让 Agent 能根据目标、上下文、工具结果、验证信号和停止条件持续迭代。"
definition: "Loop Engineering 是一种围绕 AI Agent 设计反馈循环和控制系统的方法，通过目标、上下文、工具、验证、状态记忆和停止条件，让 Agent 能从一次性输出走向可审查、可迭代、可验证的结果交付。"
not: "不等于简单自动化，不等于 Prompt Engineering，不等于让 Agent 无限自治。"
scenarios: ["AI 编程 agent 的 bug 修复、测试修复、依赖升级、PR comment 处理", "内容管线：从原始资料到文章、知识点、互链和 SEO/GEO 索引", "产品原型：根据 spec、eval、用户反馈持续迭代", "数据质量：发现异常、生成修复建议、验证结果并创建审查任务", "知识库维护：周期性发现重复概念、失效链接、缺失引用、结构漂移"]
misconceptions: ["无界循环：Agent 在同一错误上反复重试，消耗 token 和时间", "验证虚假：测试不覆盖真实问题，Agent 以为完成了", "过度自治：Agent 在没有审批的情况下改动敏感逻辑", "成本失控：多个 sub-agent、长上下文和重复验证导致费用快速上升", "上下文漂移：循环过程中目标被错误观察或无关信息带偏", "过拟合测试：Agent 只修到测试通过，却破坏真实用户体验", "责任不清：系统自动做了很多动作，但缺少审计记录和人工责任边界"]
tags: ["AI 工程化", "Agent", "反馈循环", "工作流"]
relatedConcepts: ["prompt-engineer", "harness-engineer", "dsl", "geo", "llm-wiki"]
relatedArticles: ["loop-engineering-ai-agent-feedback-loops"]
projects: []
updated: "2026-07-05"
language: "zh-CN"
citation: "Loop Engineering 是一种围绕 AI Agent 设计反馈循环和控制系统的方法，它通过目标、上下文、工具、验证、状态记忆和停止条件，让 Agent 能从一次性输出走向可审查、可迭代、可验证的结果交付。"
---

## 更完整的解释

Loop Engineering 的重点不是让模型“回答得更好”，而是让系统“把工作推进到可验证结果”。它把人的手动提示动作，转化为一套可运行、可检查、可恢复、可停止的工作流。

在传统 Prompt Engineering 中，人负责每一轮：写提示词 → 看输出 → 补上下文 → 粘贴错误 → 再提示。

在 Loop Engineering 中，系统负责大部分循环：定义目标 → 收集上下文 → 执行动作 → 观察结果 → 修正策略 → 验证完成或升级给人。人的角色从“逐轮操作者”变成“目标、边界、验证规则和审批策略的设计者”。

这个词在 2026 年 6 月后开始在 AI coding agent 圈子里密集出现。Addy Osmani 在 2026-06-07 的文章中把 Loop Engineering 描述为：不再由人亲自提示 agent，而是设计一个系统去提示 agent，并让 AI 围绕目标迭代到完成。

## 使用边界

### 适用场景

- AI 编程 agent 的 bug 修复、测试修复、依赖升级、PR comment 处理
- 内容管线：从原始资料到文章、知识点、互链和 SEO/GEO 索引
- 产品原型：根据 spec、eval、用户反馈持续迭代
- 数据质量：发现异常、生成修复建议、验证结果并创建审查任务
- 知识库维护：周期性发现重复概念、失效链接、缺失引用、结构漂移

### 不适合的场景

- 一次性问答
- 成功标准无法描述的开放创意探索
- 高风险且没有可靠验证器的操作
- 没有权限边界、日志和人工审核的生产系统

### 常见风险

- 无界循环：Agent 在同一错误上反复重试
- 验证虚假：测试不覆盖真实问题
- 过度自治：无审批的敏感操作
- 成本失控：长上下文和多重试
- 上下文漂移：目标被无关信息带偏
- 过拟合测试：只修到测试通过
- 责任不清：缺少审计记录

## 例子

冲量 AI 网站的内容自动化是一个轻量 Loop Engineering 样例：

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

这个 loop 的关键控制点：
- 输入入口固定：`content/inbox/`
- 规则固定：Pipeline DSL
- 输出契约固定：文章和知识点 frontmatter
- 验证固定：静态构建、SEO/GEO 文件生成
- 审核固定：先开 PR，不自动合并
- 记忆固定：processed manifest、git commit、PR 记录

## 与其他概念的关系

### Prompt Engineering

Prompt Engineering 解决“这一轮该怎么说”。Loop Engineering 解决“整个系统如何反复行动、观察、修正并停止”。Prompt 仍然是 loop 里的一个部件。

### Context Engineering

Context Engineering 解决“模型应该看到什么上下文”。Loop Engineering 会利用 Context Engineering，但更强调上下文如何随着每次行动和观察而更新。

### Harness Engineering

Harness Engineering 为单个 Agent 搭建运行环境：工具、权限、沙箱等。Loop Engineering 在 Harness 之上，关心这些能力如何被周期性调用、如何组合成长期任务、如何记录状态、如何升级给人。

### DSL

DSL 可以用于定义 Loop Engineering 中的规则和流程，使得系统行为和约束可配置、可复用。

### LLM Wiki

LLM Wiki 的方法论可为 Loop Engineering 中的知识管理和上下文组织提供基础。

### GEO

GEO 可指导 Loop Engineering 生成的内容如何被搜索引擎和 AI 回答系统更好地索引和引用。
