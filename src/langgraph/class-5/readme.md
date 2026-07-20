# 综合实战

基于已有项目：nestjs-prisma7-demo（feature/langgraph 分支） 技术栈：NestJS + @langchain/langgraph + Ollama（qwen3.5:0.8b） 整合：Send 并行 + Multi-Agent + Human-in-the-loop 全部知识点

## 核心价值和目标

技术选型是开发团队高频遇到的场景："用 WebSocket 还是 SSE？"、"用 Vite 还是 Webpack？"、"用 PostgreSQL 还是 MongoDB？"

传统做法：工程师自己查资料、写对比文档，花 2-3 小时才能给出靠谱的建议。

这个项目用 LangGraph 把这个过程自动化：

```plain text
用户提问 → 自动拆分调研维度 → 多 Agent 并行调研
        → 综合分析 → 生成报告 → 人工审核
        → 批准发布 / 要求修改 / 拒绝
```

## 工作流设计

```markdown
START
↓
parseTask（解析问题，拆分调研维度）
↓ Send API 并行分发
researchAgent × N（各维度并行调研）
↓ 汇聚（所有实例完成）
analyzeResults（综合分析，提取技术选项）
↓
generateReport（生成 Markdown 报告）
↓
humanReview（interrupt 暂停，等待人工）
├── approved（批准） → END
├── need_revision（修改）→ generateReport（重新生成）
└── rejected（拒绝） → END
```

### state 设计

```markdown
TechResearchState：
question string // 用户输入的问题
researchResults [] // 并行调研结果（reducer 追加）
analysis string // 综合分析
techOptions [] // 提取的技术选项（含评分）
report string // 生成的 Markdown 报告
humanFeedback string // 人工修改意见
reviewStatus string // 审核状态
revisionCount number // 修改次数（累加）
executionLog string[] // 执行日志（追加）
```
