import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, START, END, MessagesAnnotation, Annotation } from '@langchain/langgraph'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { config } from '@/config'

const SupervisorState = Annotation.Root({
  /* 
    这里定义 MessagesAnnotation.spec.messages 的类型的原因是
    1. MessagesAnnotation.spec.messages 是一个数组，里面的元素是 HumanMessage | AIMessage | SystemMessage
    2. 但是在 TypeScript 中，数组的类型是协变的，也就是说，如果你定义了一个数组类型为 HumanMessage[]，那么它不能赋值给一个类型为 (HumanMessage | AIMessage | SystemMessage)[] 的变量
    3. 所以我们需要显式地指定 MessagesAnnotation.spec.messages 的类型为 (HumanMessage | AIMessage | SystemMessage)[]
    4. 这样就可以确保在使用 MessagesAnnotation.spec.messages 时，TypeScript 能够正确地推断出它的类型，从而避免类型错误
  */
  messages: MessagesAnnotation.spec.messages,
  nextAgent: Annotation<string>(),
  completedAgents: Annotation<string[]>({
    reducer: (prev, cur) => [...prev, ...cur],
    default: () => []
  })
})

@Injectable()
export class SupervisorService implements OnModuleInit {
  private graph: any

  onModuleInit() {
    const llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature: 0
    })

    // Supervisor节点： LLM决定下一步调用哪个Agent
    const supervisor = async (state: typeof SupervisorState.State) => {
      const done = state.completedAgents.length
        ? `已完成 ${state.completedAgents.join(', ')}`
        : `尚未调用任何 Agent`

      const res = await llm.invoke([
        new SystemMessage(`你是任务协调者，管理以下专业 Agent：
          - researcher： 负责收集信息、收集资料
          - analyst： 负责分析信息、分析资料
          - writer: 负责撰写报告、优化表达

          规则：
          1. 根据任务需求按需选择Agent
          2. ${done}
          3. 所有必要工作完成后输出 FINISH
          4. 只输出下一个Agent名称 或 FINISH, 不要其他内容

          可选值: researcher, analyst, writer, FINISH
        `),
        ...state.messages
      ])

      const next = (res.content as string).trim()
      const valid = ['researcher', 'analyst', 'writer', 'FINISH']
      const safeNext = valid.includes(next) ? next : 'FINISH' // 如果LLM输出不在预期范围内，默认结束任务

      return {
        nextAgent: safeNext,
        // 把调度决定记录到消息历史，让Worker 有上下文
        messages: [new AIMessage(`[Supervisor] 下一步 -> ${safeNext}`)]
      }
    }

    // 路由函数 FINISH -> END, 其他 -> 对应worker节点
    const routeToAgent = (state: typeof SupervisorState.State) =>
      state.nextAgent === 'FINISH' ? END : state.nextAgent

    // Worker 工厂函数： 避免三个Worker节点重复代码
    const createWorker = (name: string, systemPrompt: string) => {
      return async (state: typeof SupervisorState.State) => {
        // 取第一条用户消息作为任务描述 这里始终能取到用户最早的输入，如果要取最新的输入得用findLast来找
        const userMsg = state.messages.find((m) => m.type === 'human')
        // 取最近4条消息作为上下文，包含其他Agent的输出
        const context = state.messages
          .slice(-4)
          .map((m) => m.content)
          .join('\n')

        const res = await llm.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(`原始任务: ${userMsg?.content ?? ''}\n\n当前上下文： \n${context} `)
        ])

        return {
          messages: [new AIMessage(`[${name}] ${res.content}`)],
          completedAgents: [name] // 这里会往SupervisorState.completedAgents累积，SupervisorState会记录所有已完成的Agent
        }
      }
    }
    this.graph = new StateGraph(SupervisorState)
      .addNode('supervisor', supervisor)
      .addNode(
        'researcher',
        createWorker('researcher', '你是研究员，擅长收集整理信息，提供详细调研结果。')
      )
      .addNode('analyst', createWorker('analyst', '你是分析师，擅长分析信息，提供深入见解和结论。'))
      .addNode('writer', createWorker('writer', '你是写作专家，把信息整理成清晰专业的报告。'))
      .addEdge(START, 'supervisor')
      .addConditionalEdges('supervisor', routeToAgent, {
        researcher: 'researcher',
        analyst: 'analyst',
        writer: 'writer',
        [END]: END
      })
      // 所有worker 完成后都回到supervisor 让他决定下一步
      .addEdge('researcher', 'supervisor')
      .addEdge('analyst', 'supervisor')
      .addEdge('writer', 'supervisor')
      .compile()
  }

  async run(userInput: string) {
    const result = await this.graph.invoke(
      { messages: [new HumanMessage(userInput)] },
      { recursionLimit: 10 } // 限制递归深度，避免无限循环
    )

    const messages = result.messages as AIMessage[]
    const agentLog = messages
      .filter((m) => typeof m.content === 'string' && (m.content as string).startsWith('['))
      .map((m) => m.content as string)

    const writerOutPuts = agentLog.filter((l) => l.startsWith('[writer'))
    const finalReport = writerOutPuts.length
      ? writerOutPuts.at(-1)!.replace('[writer] ', '')
      : (agentLog.at(-1) ?? '没有生成报告')

    return {
      agentLog,
      completedAgents: result.completedAgents, // 这个字段在createWorker里被累积的
      finalReport
    }
  }
}
