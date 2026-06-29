// src/mcp-agent/mcp-agent.service.ts
// LangChain Agent + MCP Tools 集成

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages'
import { config } from '../config'

@Injectable()
export class McpAgentService implements OnModuleInit, OnModuleDestroy {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    baseUrl: config.ollama.host,
    temperature: 0.1,
    think: false,
    numPredict: 1024
  })

  // MultiServerMCPClient：同时连接多个 MCP Server
  private mcpClient: MultiServerMCPClient

  // 从 MCP 转换来的 LangChain Tools
  private mcpTools: any[] = []

  /* 模块启动时初始化mcp 连接 */
  async onModuleInit() {
    this.mcpClient = new MultiServerMCPClient({
      mcpServers: {
        'local-tools': {
          transport: 'stdio',
          command: 'tsx',
          args: ['src/mcp-server/server.ts'],
          env: { ...process.env } as Record<string, string>
        }
        /* // 也可以连接社区现成的 MCP Server（举例，需要单独安装）
        'filesystem': {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        }, */
      }
    })

    /**
     * 把所有 MCP Server 的工具转成 LangChain Tools 格式
     * 之后就可以像普通 LangChain Tool 一样使用
     */
    this.mcpTools = await this.mcpClient.getTools()
    console.log(`MCP Tools 已加载：${this.mcpTools.length} 个工具`)
    this.mcpTools.forEach((tool) =>
      console.log(`  - ${tool.name}: ${tool.description?.slice(0, 50)}`)
    )
  }
  /* Agent 执行 (LLM 自主决策调用MCP工具) */
  async runAgent(userMessage: string) {
    if (!this.mcpTools.length) {
      return { error: 'MCP Tools 未初始化，请检查 MCP Server 是否启动' }
    }

    // 1. 把MCP Tools 绑定到LLM (和普通 LangChain Tool 完全一样)
    const llmWithTools = this.llm.bindTools(this.mcpTools)

    // 工具Map (通过name找到对应的tool执行)
    const toolMap: Record<string, any>[] = Object.fromEntries(
      this.mcpTools.map((tool) => [tool.name, tool])
    )

    const messages: any[] = [
      new SystemMessage(`你是一个智能助手，可以使用以下工具帮助用户：
        - query_users: 查询用户数据库
        - read_file: 读取项目文件
        - write_file: 写入项目文件
        - get_weather: 获取城市天气信息
        
        根据用户的问题，选择合适的工具获取信息后回答，用中文回答`),
      new HumanMessage(userMessage)
    ]

    const steps: string[] = []
    let roundCount = 0

    // Agent 决策循环
    while (roundCount < 6) {
      roundCount++
      const response = await llmWithTools.invoke(messages)
      messages.push(response)

      // 没有工具调用 -> 直接返回 LLM 最终回答
      if (!response.tool_calls?.length) {
        steps.push(`💬 [最终回答] ${response.content}`)
        break
      }

      // 执行MCP 工具调用
      for (const toolCall of response.tool_calls) {
        steps.push(`🔧 [MCP工具调用] ${toolCall.name}(${JSON.stringify(toolCall.args)})`)

        const toolFn = toolMap[toolCall.name]
        if (!toolFn) {
          const errMsg = `工具不存在： ${toolCall.name}`
          steps.push(`❌ 错误：${errMsg}`)
          messages.push(
            new ToolMessage({
              content: errMsg,
              tool_call_id: toolCall.id ?? ''
            })
          )
          continue
        }

        // 调用 MCP 工具 (底层通过MCP 协议发请求给Server)
        const result = await toolFn.invoke(toolCall.args)
        steps.push(`✅ [MCP工具结果] ${JSON.stringify(result).slice(0, 200)}`)

        messages.push(
          new ToolMessage({
            content: String(result),
            tool_call_id: toolCall.id ?? ''
          })
        )
      }
    }

    const lastAI = [...messages].reverse().find((msg) => msg instanceof AIMessage) as AIMessage

    return {
      userMessage,
      steps,
      totalRounds: roundCount,
      answer: lastAI?.content ?? '抱歉，无法完成请求'
    }
  }
  // 只获取工具列表 （不执行Agent决策）
  async listMcpTools() {
    return this.mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description
    }))
  }

  async onModuleDestroy() {
    await this.mcpClient?.close()
  }
}
