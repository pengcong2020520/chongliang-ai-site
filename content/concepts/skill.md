---
type: concept
title: AI Skill 是什么
slug: skill
term: AI Skill
aliases: [AI技能, Skill封装, Agent能力封装]
category: AI 工程化
parent: AI 工程化
summary: AI Skill 是可复用的 Agent 能力封装，内嵌完整 SOP 链路和所需工具，从手动传包正在演进为仓库化标准生态。
definition: AI Skill 是一种将领域使用文档、触发条件、执行流程、可调用工具和最佳实践示例封装为标准化可分发单元的能力封装形式，通过 SKILL.md 规范实现跨代理复用，用 1/50 的成本做到 MCP Schema 同样的事。
not: 它不等于工具（Tool）——工具是可调用的单点能力，Skill 是标准化 SOP 沉淀的任务方法论；它也不等于 Workflow——Workflow 所有节点固定写死，Skill 保留了 Agent 的自主决策空间；它更不等于提示词模板——Skill 封装的是完整的专业能力。
scenarios: [代码审查 Skill 封装审查方法论和规范, 多语言翻译 Skill 封装翻译流程和质量标准, 业务审核 Skill 封装审核规则和兜底逻辑, 企业内部跨团队复用 AI 能力]
misconceptions: [把 Skill 理解成提示词模板——Skill 包含完整 SOP、工具和示例，不只是一段话, 以为 Skill 和 Workflow 一样——Workflow 节点写死，Skill 保留 Agent 自主决策空间, 认为技能写完就完了——Skill 需要持续维护、版本管理和迭代, 忽略公私分离——把涉及业务专有逻辑的技能放在公开仓库]
tags: [AI, Skill, 技能封装, 仓库化]
relatedConcepts: [mcp, harness-engineer, agent-harness, prompt-engineer, vibe-coding, loop-engineering]
relatedArticles: []
projects: []
updated: 2026-07-06
language: zh-CN
citation: AI Skill 是用 1/50 的成本做到 MCP Schema 同样事的能力封装——把一个有经验的工程师对工具的理解压缩成一份简短说明交给 AI。
---

## 更完整的解释

AI 技能的复用与共享正在经历从"手动传包"到"仓库化标准生态"的范式迁移。核心驱动力不是某个厂商的推动，而是三个条件的同时成熟：标准化的封装格式、一条命令安装的分发机制、版本管理带来的持续维护能力。

### Skill 的核心组成

一个合格的 Skill 需要包含：

1. **触发条件**：什么场景下使用这个 Skill
2. **完整流程（SOP）**：标准化的执行步骤
3. **可调用工具**：这个 Skill 可以用哪些工具
4. **Bad Case 避坑限制**：常见错误和规避策略
5. **最佳实践示例（Few Shot）**：高质量输入-输出示例
6. **相关模板资产**：单独文件夹管理的配套资源

### Skill vs Tool vs Workflow

| 层次 | 定位 | 示例 |
|------|------|------|
| Tool / MCP | 可调用的单点工具 | 时间服务、地图服务、检索服务 |
| Skill | 标准化 SOP，沉淀任务方法论 | 文档规范、代码审查方法、工作流 |
| 插件 | 大粒度能力扩展 | IM 通道插件、数据库适配插件 |

Skill 的价值在于**减少 Agent Loop 的复杂度**。不是所有能力都应该写进核心流程，有些通用经验可以作为可分发、可复用的技能包存在。

Workflow 所有节点固定写死；Skill 保留了 Agent 的自主决策空间，灵活性更高。

### 仓库化的三个必要条件

1. **标准化封装**：技能文件有统一格式（SKILL.md），元数据可机器解析
2. **一条命令安装**：消费者不需要手动下载解压配置，`npx skills add <owner/repo>` 完成全部
3. **版本管理**：基于 Git 仓库获得版本追踪、变更日志、回滚能力

**这三个条件中，标准化封装是地基。** 没有它，一条命令安装无从实现。

### 安全红线：公私分离

- 公开技能（通用代码规范、文档写作模板）→ GitHub 公开仓库
- 团队技能（业务规则、内部工具链）→ 私有 Git 仓库
- 个人技能（个人工作流定制）→ 本地目录

**任何把敏感技能放在公开仓库的行为都应被视为安全事故。**

### SKILL.md 标准将成为事实标准

Anthropic 2025 年 12 月在 agentskills.io 发布 SKILL.md 规范，截至 2026 年中已被 30+ 主流平台采纳。一个技能文件可以在数十个代理上运行。不支持 SKILL.md 格式的 AI 代理将面临生态边缘化。

## 例子

Hermes Agent 的社区技能仓库（awesome-hermes-skills）收录了 85 个内置技能和 78 个社区技能，支持一条命令安装。开发者不需要理解框架内部机制，只需要 `npx skills add <owner/repo>`，技能文件按 SKILL.md 规范解析元数据后安装到技能目录，AI 代理立刻获得特定能力。这就是从"手动传包"到"仓库化"的完整跃迁——共享的不再是文件，而是能力。
