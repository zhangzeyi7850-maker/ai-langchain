import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOpenAI } from '@langchain/openai'
import {
  StateGraph,
  START,
  END,
  Annotation,
  MemorySaver,
  interrupt,
  Command
} from '@langchain/langgraph'
import { HumanMessage } from '@langchain/core/messages'
import { config } from '@/config'

const EmailState = Annotation.Root({
  emailRequest: Annotation<string>(),
  draftEmail: Annotation<{ subject: string; recipient: string; body: string }>(),
  approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | 'need_modify'>(),
  modifyFeedback: Annotation<string>(), // 修改意见
  revisionCount: Annotation<number>({
    // 记录修改次数
    reducer: (prev, cur) => prev + cur,
    default: () => 0
  }),
  finalStatus: Annotation<string>()
})

@Injectable()
export class EmailApprovalService implements OnModuleInit {
  private graph: any
  private llm!: ChatOpenAI

  onModuleInit() {
    // 创建 ChatOpenAI 实例
    this.llm = new ChatOpenAI({
      model: config.langGraph.model,
      apiKey: config.langGraph.apiKey,
      configuration: {
        baseURL: config.langGraph.baseURL
      },
      temperature: 0.5,
      maxTokens: 512,
      modelKwargs: {
        thinking: {
          type: 'disabled'
        }
      }
    })

    /* 节点1 邮件草稿
       ✅ 节点名改为 draftNode，避免和 State 字段 draftEmail 冲突
    */
    const draftNode = async (state: typeof EmailState.State) => {
      const isRevision = !!state.modifyFeedback
      console.log(`\n✍️  [draftNode] ${isRevision ? '根据修改意见重新起草' : '初次起草'}邮件`)

      const prompt = isRevision
        ? `根据修改意见重新起草邮件：
          修改意见：${state.modifyFeedback}
          原始需求：${state.emailRequest}
          上次草稿：${JSON.stringify(state.draftEmail)}`
        : `根据需求起草一封专业邮件：${state.emailRequest}`

      const res = await this.llm.invoke([
        new HumanMessage(
          `${prompt}\n\n输出 JSON（不要其他内容）：
          {"subject":"邮件主题","recipient":"收件人","body":"正文内容"}`
        )
      ])

      let draft: { subject: string; recipient: string; body: string }
      try {
        const json = (res.content as string).replace(/```json\n?|\n?```/g, '').trim()
        draft = JSON.parse(json)
      } catch {
        draft = { subject: '草稿', recipient: '未知', body: res.content as string }
      }

      console.log(`   收件人: ${draft.recipient}，主题: ${draft.subject}`)
      return {
        draftEmail: draft,
        approvalStatus: 'pending' as const,
        revisionCount: isRevision ? 1 : 0
      }
    }

    /* 节点2 等待人工审批 (interrupt暂停)
      ✅ 节点名改为 waitForApprovalNode，避免和 State 字段 approvalStatus 冲突
     */
    const waitNode = async (state: typeof EmailState.State) => {
      console.log(`\n⏸️  [waitNode] 等待人工审批（第 ${state.revisionCount + 1} 版）`)

      const decision = interrupt({
        type: 'email_review',
        message: `请审查邮件草稿（第 ${state.revisionCount + 1} 版）`,
        draft: state.draftEmail,
        options: {
          approve: '批准发送',
          reject: '拒绝（取消发送）',
          modify: '需要修改（附修改意见）'
        }
      })

      console.log(`   人工决定: ${JSON.stringify(decision)}`)

      /* 
        这里判断decision类型 是因为 interrupt 返回的可能是字符串或对象
        - 如果是字符串，说明用户选择了 approve 或 reject
        - 如果是对象，说明用户选择了 modify，并附带了修改意见
      */
      if (typeof decision === 'string') {
        return { approvalStatus: decision as any }
      }
      if (typeof decision === 'object' && (decision as any)?.action === 'modify') {
        return {
          approvalStatus: 'need_modify' as const,
          modifyFeedback: (decision as any).feedback as string
        }
      }
      return { approvalStatus: 'rejected' as const }
    }

    // ── 路由函数
    const routeAfterApproval = (state: typeof EmailState.State) => {
      console.log(`\n🔀 [route] approvalStatus = ${state.approvalStatus}`)
      switch (state.approvalStatus) {
        case 'approved':
          return 'sendNode'
        case 'need_modify':
          return 'draftNode' // 回到起草节点重新起草
        default:
          return 'cancelNode'
      }
    }

    /* 节点3 发送邮件 
      ✅ 节点名改为 sendNode
    */
    const sendNode = async (state: typeof EmailState.State) => {
      console.log(`\n📤 [sendNode] 发送邮件`)
      console.log(`   收件人: ${state.draftEmail.recipient}`)
      console.log(`   主题:   ${state.draftEmail.subject}`)
      // 实际项目里调用 Nodemailer / SendGrid / 企业邮件 API
      return {
        finalStatus: `✅ 邮件已发送\n收件人：${state.draftEmail.recipient}\n主题：${state.draftEmail.subject}`
      }
    }

    /* 节点4 取消发送
      ✅ 节点名改为 cancelNode
    */
    const cancelNode = async (state: typeof EmailState.State) => {
      console.log(`\n🚫 [cancelNode] 邮件已取消，状态: ${state.approvalStatus}`)
      return {
        finalStatus: `❌ 邮件已取消（审批状态：${state.approvalStatus}）`
      }
    }

    this.graph = new StateGraph(EmailState)
      .addNode('draftNode', draftNode)
      .addNode('waitNode', waitNode)
      .addNode('sendNode', sendNode)
      .addNode('cancelNode', cancelNode)
      .addEdge(START, 'draftNode')
      .addEdge('draftNode', 'waitNode')
      .addConditionalEdges('waitNode', routeAfterApproval, {
        sendNode: 'sendNode',
        draftNode: 'draftNode',
        cancelNode: 'cancelNode'
      })
      .addEdge('sendNode', END)
      .addEdge('cancelNode', END)
      .compile({ checkpointer: new MemorySaver() })

    console.log('✅ 邮件审批工作流初始化完成')
  }

  /* 对外方法 */
  // 发起邮件审批流程
  async start(emailRequest: string, threadId: string) {
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📨 [email/start] threadId: ${threadId}`)
    console.log(`   需求: "${emailRequest}"`)

    const result = await this.graph.invoke(
      { emailRequest },
      { configurable: { thread_id: threadId } }
    )

    /* 
      如果 result 包含 __interrupt__，说明流程被暂停，等待人工审批 这里就返回暂停时的状态和数据，前端可以根据这个状态显示审批界面
      暂停数据来自于waitNode节点的 interrupt 方法，里面包含了草稿邮件和审批选项
    */
    if (result.__interrupt__) {
      return {
        status: 'waiting_for_approval',
        threadId,
        reviewData: result.__interrupt__[0].value,
        message: '邮件草稿已生成，请审批'
      }
    }
    return { status: 'completed', result }
  }

  // 审批通过
  async approve(threadId: string) {
    console.log(`\n✅ [email/approve] threadId: ${threadId}`)
    await this.graph.invoke(new Command({ resume: 'approved' }), {
      configurable: { thread_id: threadId }
    })
    const state = await this.graph.getState({ configurable: { thread_id: threadId } })
    return { status: 'email_sent', finalStatus: state.values.finalStatus }
  }

  // 审批拒绝
  async reject(threadId: string) {
    console.log(`\n❌ [email/reject] threadId: ${threadId}`)
    await this.graph.invoke(new Command({ resume: 'rejected' }), {
      configurable: { thread_id: threadId }
    })
    return { status: 'cancelled', message: '邮件已取消发送' }
  }

  // 请求修改
  async requestModify(threadId: string, feedback: string) {
    console.log(`\n✏️  [email/modify] threadId: ${threadId}`)
    console.log(`   修改意见: "${feedback}"`)
    const result = await this.graph.invoke(
      new Command({ resume: { action: 'modify', feedback } }),
      { configurable: { thread_id: threadId } }
    )
    if (result.__interrupt__) {
      return {
        status: 'waiting_for_approval',
        reviewData: result.__interrupt__[0].value,
        message: '邮件已修改，请重新审批'
      }
    }
    return { status: 'completed' }
  }

  // 获取当前状态
  async getState(threadId: string) {
    const state = await this.graph.getState({ configurable: { thread_id: threadId } })
    return state.values
  }
}
