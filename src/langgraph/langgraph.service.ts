import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, MessagesAnnotation, MemorySaver } from '@langchain/langgraph'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { config } from '../config'

@Injectable()
export class LanggraphService implements OnModuleInit {
  private simpleGraph: any
  private memoryGraph: any

  // OnModuleInit 是 NestJS 的生命周期钩子，当模块初始化时会调用该方法
  onModuleInit() {
    // ChatOpenAI 接 Ollama：
    // Ollama 完全兼容 OpenAI 的 /v1/chat/completions 接口
    // 只需把 baseURL 指向本地 Ollama，apiKey 随便填即可
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: {
        baseURL: config.langGraph.baseURL
      },
      temperature: config.langGraph.temperature
    })

    /* 工作流1： 无记忆，每次invoke独立 */
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      // state.messages 包含本次传入的所有消息
      const response = await llm.invoke(state.messages)
      // 只返回新增消息，langgraph 自动增加 （不覆盖历史）
      return { messages: [response] }
    }

    this.simpleGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile()

    /* 工作流2：有记忆，通threadId 共享历史 */
    const callModelWithMemory = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        new SystemMessage('你是专业的AI助手,请记住对话上下文'),
        ...state.messages // 展开全部历史，让LLM看到完整上下文
      ]
      const response = await llm.invoke(messages)
      return {
        messages: [response]
      }
    }

    this.memoryGraph = new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModelWithMemory)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile({ checkpointer: new MemorySaver() }) // 使用 MemorySaver 保存历史

    console.log(`LangGraph 初始化完成，模型为${config.langGraph.model}`)
  }

  // 这个是一个简单的聊天接口，使用无记忆的工作流
  async simpleChat(message: string): Promise<string> {
    const result = await this.simpleGraph.invoke({
      messages: [new SystemMessage('你是专业的AI助手，请回答简洁清晰'), new HumanMessage(message)]
    })
    return result.messages.at(-1).content as string // 返回最后一条消息的内容
  }

  // 这个是一个有记忆的聊天接口，使用有记忆的工作流
  async memoryChat(threadId: string, message: string): Promise<string> {
    const result = await this.memoryGraph.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: threadId } }
    )
    return result.messages.at(-1).content as string // 返回最后一条消息的内容
  }

  // 获取某个 thread 的历史消息
  async getHistory(threadId: string) {
    // getState 获取某个 thread 当前保存的完整状态
    const state = await this.memoryGraph.getState({
      configurable: { thread_id: threadId }
    })

    return (state.values.messages ?? []).map((msg: any, index: number) => ({
      index,
      role: msg.type === 'human' ? 'user' : 'assistant',
      content: msg.content
    }))
  }
}
