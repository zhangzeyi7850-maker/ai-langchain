import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, MessagesAnnotation, MemorySaver } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langGraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { config } from '../../../config'

/* 工具定义 */
/* 工具1: 计算工具 */
const calculatorTool = tool(
  async ({ expression }) => {
    // expression 表达式
    try {
      const result = Function(`'use strict'; return (${expression})`)()
      return `计算结果: ${expression} = ${result}`
    } catch (error) {
      return `计算错误: ${error.message}`
    }
  },
  {
    name: 'calculator',
    description: '计算数学表达式，例如(2 + 3) * 4',
    schema: z.object({
      expression: z.string().describe('合法的 JS 数学表达式')
    })
  }
)

/* 工具2：天气工具 */
const weatherTool = tool(
  async ({ city }) => {
    const mock: Record<string, string> = {
      北京: '晴天，温度25°C',
      上海: '多云，温度28°C',
      广州: '小雨，温度30°C',
      成都: '阴天，温度22°C'
    }
    return mock[city] ?? `${city}: 未知城市，无法获取天气信息`
  },
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气',
    schema: z.object({
      city: z.string().describe('城市名称，如 北京、上海、广州、成都等')
    })
  }
)

const tools = [calculatorTool, weatherTool]

@Injectable()
export class ReactAgentService implements OnModuleInit {
  private graph: any

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: {
        baseURL: config.langGraph.baseURL
      },
      temperature: 0 // 工具调用用0温度，输出更稳定。
    })

    /* 
      bindTools 把工具的 name、description、schema 注入 LLM
      LLM 推理时知道有哪些工具可以调用，需要时生成tool_calls
    */
    const llmWithTools = llm.bindTools(tools)

    // ToolNode：封装 "执行LLM返回的 tool_calls"的完整逻辑
    const toolNode = new ToolNode(tools)

    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        new SystemMessage(`你是专业助手, 可用工具：
          - calculator: 数学计算
          - get_weather: 查询指定城市的当前天气
          根据问题决定是否调用工具  
        `),
        ...state.messages
      ]
      const response = await llmWithTools.invoke(messages)
      return {
        messages: [response]
      }
    }

    // 路由函数：检查最后一条消息是否包含tool_calls
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const last = state.messages.at(-1) as AIMessage
      /* 
        1. 有tool_calls，说明需要调用工具，继续循环
        2. 没有tool_calls，说明不需要调用工具，结束循环
      */
      return (last.tool_calls?.length ?? 0) > 0 ? 'tools' : END
    }

    this.graph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'callModel')
      .addConditionalEdges('callModel', shouldContinue, {
        tools: 'tools',
        [END]: END
      })
      .addEdge('tools', 'callModel') // 工具执行完 -> 回到lLM，形成循环
      .compile({ checkpointer: new MemorySaver() }) // 保存中间状态，方便调试

    console.log('ReAct Agent 初始化完成')
  }

  async chat(threadId: string, message: string): Promise<string> {
    const result = await this.graph.invoke(
      { messages: [new HumanMessage(message)] },
      {
        configurable: { thread_id: threadId },
        recursionLimit: 20 // 最多循环 20 次工具调用，防止死循环
      }
    )
    return result.messages.at(-1)?.content as string
  }
}
