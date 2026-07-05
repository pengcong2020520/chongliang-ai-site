# Loop Engineering 调研笔记

## 调研目的

这份笔记用于沉淀“Loop Engineering”这个新兴 AI 工程概念，并作为冲量 AI 知识库的原始导入材料。期望后续拆成一个原子知识点页面，必要时再生成一篇围绕 AI 工作流设计的方法论文章。

建议知识点 slug：`loop-engineering`

建议关联知识点：

- `prompt-engineer`
- `harness-engineer`
- `dsl`
- `llm-wiki`
- `geo`

## 一句话定义

Loop Engineering 是围绕 AI Agent 设计可重复运行的反馈系统，让 Agent 能根据目标、上下文、工具结果、验证信号和停止条件持续迭代，而不是依赖人类一轮一轮手动提示。

## 核心判断

Loop Engineering 的重点不是让模型“回答得更好”，而是让系统“把工作推进到可验证结果”。它把人的手动提示动作，转化为一套可运行、可检查、可恢复、可停止的工作流。

在传统 Prompt Engineering 中，人负责每一轮：

```text
写提示词 → 看输出 → 补上下文 → 粘贴错误 → 再提示
```

在 Loop Engineering 中，系统负责大部分循环：

```text
定义目标 → 收集上下文 → 执行动作 → 观察结果 → 修正策略 → 验证完成或升级给人
```

人的角色从“逐轮操作者”变成“目标、边界、验证规则和审批策略的设计者”。

## 概念来源与语境

这个词在 2026 年 6 月后开始在 AI coding agent 圈子里密集出现。Addy Osmani 在 2026-06-07 的文章中把 Loop Engineering 描述为：不再由人亲自提示 agent，而是设计一个系统去提示 agent，并让 AI 围绕目标迭代到完成。

LangChain 的文章把 agent 的能力拆成多层 loop：基础 agent loop、verification loop、event-driven loop 等。它强调 Agent 并不只是一次模型调用，而是模型和工具循环交互，直到任务完成；当任务需要稳定质量时，还需要在外层增加验证循环。

ADTmag 对 Andrew Ng 相关观点的梳理中，提到三类 loop：agentic coding loop、developer feedback loop、external feedback loop。这个框架说明 Loop Engineering 不只发生在代码生成内部，还可以连接开发者判断、用户反馈和产品方向。

Kilo 的文章把 Loop Engineering 概括为：设计 AI 编程 agent 的计划、行动、观察和调整过程，让它在真实代码库中依靠测试、日志、diff、review 和人工反馈取得可验证进展。

## 它不是什么

Loop Engineering 不等于简单自动化。自动化可以把错误动作重复很多次，而 Loop Engineering 必须包含测量、解释、修正和终止机制。

Loop Engineering 也不等于 Prompt Engineering。Prompt Engineering 关注给模型的输入怎么写；Loop Engineering 关注模型外部的完整运行系统，包括触发器、工具、上下文、验证、权限、状态、成本、审批和停止条件。

Loop Engineering 也不等于让 Agent 无限自治。好的 loop 不是“放手不管”，而是受控自治：允许系统在明确边界内迭代，同时在不确定、危险或成本过高时停下来请求人类判断。

## 与相邻概念的关系

### Prompt Engineering

Prompt Engineering 解决“这一轮该怎么说”。Loop Engineering 解决“整个系统如何反复行动、观察、修正并停止”。

Prompt 仍然重要，但它只是 loop 里的一个部件。一个好的 loop 会把提示词、上下文、工具调用、验证结果和下一步策略组织成可重复流程。

### Context Engineering

Context Engineering 解决“模型应该看到什么上下文”。Loop Engineering 会利用 Context Engineering，但更强调上下文如何随着每次行动和观察而更新。

例如，测试失败、编译错误、review comment、用户反馈都不是外部杂音，而是下一轮上下文的一部分。

### Harness Engineering

Harness Engineering 更像是为单个 Agent 搭建运行环境：工具、权限、沙箱、文件系统、测试命令、评测器等。Loop Engineering 在 Harness 之上，关心这些能力如何被周期性调用、如何组合成长期任务、如何记录状态、如何升级给人。

可以理解为：

```text
Prompt Engineering: 单轮输入设计
Context Engineering: 上下文供给设计
Harness Engineering: Agent 运行环境设计
Loop Engineering: Agent 反馈循环与控制系统设计
```

## 一个基础 Loop 的结构

一个可用的 Loop Engineering 结构通常包含：

1. 目标：要完成什么，成功标准是什么。
2. 上下文：当前任务需要哪些代码、文档、历史状态、约束和外部信号。
3. 行动：Agent 可以编辑文件、调用工具、搜索资料、运行测试、打开 PR。
4. 观察：系统读取测试结果、构建日志、diff、链接检查、review comment、用户反馈。
5. 调整：根据观察结果修改计划或下一步动作。
6. 验证：用测试、lint、人工审核、评测集或业务指标判断是否达到标准。
7. 停止：达到成功标准、撞到明确阻塞、超过成本预算、触发风险规则时停止。
8. 记忆：把状态写到文件、issue、Linear、PR、数据库或其他持久层，避免每次从零开始。

## Addy Osmani 提到的五个构件

Addy Osmani 把 Loop Engineering 的工程构件概括为五类，再加一个记忆层：

- Automations：按计划或事件触发发现、分诊和执行。
- Worktrees：隔离并行任务，避免多个 agent 互相踩代码。
- Skills：把项目知识写成可调用能力，减少 agent 乱猜。
- Plugins / Connectors：接入已有工具、数据源和协作系统。
- Sub-agents：让不同 agent 承担构思、实现、检查等不同角色。
- Memory：把进展、状态、下一步写到持久位置。

这组构件对个人知识库网站也有启发：上传到 `content/inbox/` 是触发器；DSL 是 skill/规则；DeepSeek 是执行模型；GitHub Actions 是 automation；PR 是 review gate；`.processed.json` 和 git 历史是状态记忆。

## 冲量 AI 网站中的 Loop Engineering 示例

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

这个 loop 的关键不是“AI 自动写内容”，而是它有清晰的控制点：

- 输入入口固定：`content/inbox/`
- 规则固定：`content/pipeline/chongliang-ai.pipeline.json`
- 输出契约固定：文章和知识点 frontmatter
- 验证固定：静态构建、SEO/GEO 文件生成
- 审核固定：先开 PR，不自动合并
- 记忆固定：processed manifest、git commit、PR 记录

## 好的 Loop Engineering 判断标准

一个好的 loop 应该满足：

- 目标清晰：Agent 知道什么叫完成，而不是无限探索。
- 上下文可控：只给必要上下文，同时能纳入新观察。
- 行动可逆：每一步尽量小，方便回滚和 review。
- 验证可靠：测试、构建、lint、链接检查、人工审核等信号可信。
- 停止明确：成功、失败、阻塞、预算耗尽都要有规则。
- 角色分离：生成者和检查者最好分开，避免自我确认。
- 成本可控：对模型、token、并行 agent、重试次数设预算。
- 权限最小：Agent 只能做当前任务所需的动作。
- 状态持久：长期任务需要外部记忆，不依赖一次会话上下文。

## 常见风险

1. 无界循环：Agent 在同一错误上反复重试，消耗 token 和时间。
2. 验证虚假：测试不覆盖真实问题，Agent 以为完成了。
3. 过度自治：Agent 在没有审批的情况下改动敏感逻辑。
4. 成本失控：多个 sub-agent、长上下文和重复验证导致费用快速上升。
5. 上下文漂移：循环过程中目标被错误观察或无关信息带偏。
6. 过拟合测试：Agent 只修到测试通过，却破坏真实用户体验。
7. 责任不清：系统自动做了很多动作，但缺少审计记录和人工责任边界。

## 适用场景

Loop Engineering 特别适合：

- AI 编程 agent 的 bug 修复、测试修复、依赖升级、PR comment 处理。
- 内容管线：从原始资料到文章、知识点、互链和 SEO/GEO 索引。
- 产品原型：根据 spec、eval、用户反馈持续迭代。
- 数据质量：发现异常、生成修复建议、验证结果并创建审查任务。
- 知识库维护：周期性发现重复概念、失效链接、缺失引用、结构漂移。

不适合的场景：

- 一次性问答。
- 成功标准无法描述的开放创意探索。
- 高风险且没有可靠验证器的操作。
- 没有权限边界、日志和人工审核的生产系统。

## 可引用摘要

Loop Engineering 是一种围绕 AI Agent 设计反馈循环和控制系统的方法，它通过目标、上下文、工具、验证、状态记忆和停止条件，让 Agent 能从一次性输出走向可审查、可迭代、可验证的结果交付。

## 来源链接

- Addy Osmani, Loop Engineering, 2026-06-07: https://addyosmani.com/blog/loop-engineering/
- LangChain, The Art of Loop Engineering, 2026-06-16: https://www.langchain.com/blog/the-art-of-loop-engineering
- Kilo, What Is Loop Engineering? AI Feedback Loops: https://kilo.ai/articles/what-is-loop-engineering
- ADTmag, Loop Engineering Emerges as Developers Put AI Coding Agents on Repeat, 2026-07-01: https://adtmag.com/articles/2026/07/01/loop-engineering-emerges-as-developers-put-ai-coding-agents-on-repeat.aspx
