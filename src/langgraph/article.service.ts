/**
 * START → extractKeywords → generateSummary → END
 *
 * State 流转：
 * 输入：{ article: '文章内容...' }
 *   ↓
 * extractKeywords：读 state.article → 写 state.keywords[]
 *   ↓
 * generateSummary：读 state.article + state.keywords → 写 state.summary
 *   ↓
 * 输出：{ article, keywords, summary, log }
 *
 * 节点间通过 State 传递数据：
 * extractKeywords 写入 keywords，generateSummary 直接从 state.keywords 读取
 * 不需要显式传参，State 自动贯穿
 */

import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import { HumanMessage } from '@langchain/core/messages'
import { config } from '../config'

// 自定义State： 定义这个工作流里所有节点共享的数据结构
const ArticleState = Annotation.Root({
  // 原始文章(输入，各节点只读)
  article: Annotation<string>(),

  // 关键词数组(extractKeywords写入，generateSummary读取)
  // reducer 追加： 如果并行有多个节点写入，不会互相覆盖
  keyWords: Annotation<string[]>({
    reducer: (prev, cur) => [...prev, ...cur],
    default: () => []
  }),

  // 最终摘要(generateSummary写入)
  summary: Annotation<string>(),

  // 执行日志 (每个节点追加自己的耗时)
  log: Annotation<string[]>({
    reducer: (prev, cur) => [...prev, ...cur],
    default: () => []
  })
})

@Injectable()
export class ArticleService implements OnModuleInit {
  private graph: any

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: {
        baseURL: config.langGraph.baseURL
      },
      temperature: 0.3 // 摘要用低温度，输出更稳定
    })

    /* 节点1： 提取关键词 */
    const extractKeywords = async (state: typeof ArticleState.State) => {
      const t0 = Date.now()
      const res = await llm.invoke([
        new HumanMessage(
          `从一下文章提取5-8个核心关键词，只输出关键词，逗号分割，不要其他内容: \n\n ${state.article}`
        )
      ])
      const keywords = (res.content as string)
        .split(/[,，]/)
        .map((keyWord) => keyWord.trim())
        .filter(Boolean)

      return {
        keywords,
        log: [`关键词提取完成 (${Date.now() - t0}ms)`]
      }
    }

    /* 
    节点2： 生成摘要 
    state.keywords 此时已经是extractKeywords写入的值
    */
    const generateSummary = async (state: typeof ArticleState.State) => {
      const t0 = Date.now()
      const res = await llm.invoke([
        new HumanMessage(
          `根据以下文章生成200字以内的摘要。\n 参考关键词： ${state.keyWords.join('、')}\n\n文章内容: \n ${state.article}`
        )
      ])

      return {
        summary: res.content as string,
        log: [`摘要生成完成 (${Date.now() - t0}ms)`]
      }
    }

    this.graph = new StateGraph(ArticleState)
      .addNode('extractKeywords', extractKeywords)
      .addNode('generateSummary', generateSummary)
      .addEdge(START, 'extractKeywords')
      .addEdge('extractKeywords', 'generateSummary')
      .addEdge('generateSummary', END)
      .compile()
  }

  async process(article: string) {
    const result = await this.graph.invoke({ article })
    return {
      keywords: result.keywords, // 这里的数据是从 extractKeywords 节点写入的
      summary: result.summary, // 这里的数据是从 generateSummary 节点写入的
      log: result.log // 这里的数据是从两个节点写入的，按顺序追加
    }
  }
}
