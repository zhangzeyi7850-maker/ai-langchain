import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import { HumanMessage } from '@langchain/core/messages'
import { config } from '@/config'

const PipelineState = Annotation.Root({
  topic: Annotation<string>(),
  research: Annotation<string>(),
  outline: Annotation<string>(),
  draft: Annotation<string>(),
  finalArticle: Annotation<string>(),
  progress: Annotation<string[]>({
    reducer: (prev, cur) => [...prev, ...cur],
    default: () => []
  })
})
@Injectable()
export class PipelineService implements OnModuleInit {
  private graph: any

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature: 0.7
    })

    /* 收集素材的Agent */
    const researchAgent = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是研究员，为主题"${state.topic}"收集素材：
          1. 背景介绍(2-3句)
          2. 核心要点(3-5句)  
          3. 典型案例(1-2个)
          每条不超过50字。
        `)
      ])
      return {
        research: res.content as string, // researchAgent 生成的内容会自动存储在 state.research 中 覆盖
        progress: ['✅ 素材收集完成'] // progress 会自动累加
      }
    }

    /* 写大纲Agent */
    const outlineAgent = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是内容策划，根据素材为"${state.topic}"生成大纲：
          素材：${state.research}
          格式：# 章节 / - 子项，共3-5章
        `)
      ])
      return {
        outline: res.content as string, // outlineAgent 生成的内容会自动存储在 state.outline 中 覆盖
        progress: ['✅ 内容策划完成'] // progress 会自动累加
      }
    }

    /* 文章撰写Agent */
    const writingAgent = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是撰稿人，根据大纲编写文章(400-600字)：
          主题：${state.topic}
          大纲: ${state.outline}
          参考素材: ${state.research}
        `)
      ])
      return {
        draft: res.content as string, // writingAgent 生成的内容会自动存储在 state.draft 中 覆盖
        progress: ['✅ 文章撰写完成'] // progress 会自动累加
      }
    }

    /* review优化Agent */
    const reviewAgent = async (state: typeof PipelineState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`你是编辑，根据文章进行优化，直接输出优化后的全文：\n ${state.draft}`)
      ])
      return {
        finalArticle: res.content as string, // reviewAgent 生成的内容会自动存储在 state.finalArticle 中 覆盖
        progress: ['✅ 审核优化完成'] // progress 会自动累加
      }
    }

    this.graph = new StateGraph(PipelineState)
      .addNode('researchAgent', researchAgent)
      .addNode('outlineAgent', outlineAgent)
      .addNode('writingAgent', writingAgent)
      .addNode('reviewAgent', reviewAgent)
      .addEdge(START, 'researchAgent')
      .addEdge('researchAgent', 'outlineAgent')
      .addEdge('outlineAgent', 'writingAgent')
      .addEdge('writingAgent', 'reviewAgent')
      .addEdge('reviewAgent', END)
      .compile()
  }

  async createContent(topic: string) {
    const t0 = Date.now()
    const result = await this.graph.invoke({ topic })
    return {
      topic,
      progress: result.progress,
      finalArticle: result.finalArticle,
      totalTime: `${Date.now() - t0}ms`
    }
  }
}
