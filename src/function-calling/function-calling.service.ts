import { Injectable } from '@nestjs/common'
import { config } from 'src/config'
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters' // 文本分割器
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory' // 内存向量库，适合小规模数据，重启后数据会丢失
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { check, z } from 'zod'
import { tool } from '@langchain/core/tools'

@Injectable()
export class FunctionCallingService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512 // 本次回答最多生成512 tokens的内容
  })

  /**
   * 业务工具定义
   */

  // 工具1 查询商品库存
  private checkInventory = tool(
    async ({ productName }: { productName: string }) => {
      // 模拟数据库查询（实际项目可以注入 PrismaService 或者 TypeORM Repository 来查询数据库）
      const db: Record<string, { stock: number; price: number }> = {
        'iPhone 16': { stock: 10, price: 999 },
        'MacBook Pro': { stock: 5, price: 1999 },
        'AirPods Pro': { stock: 20, price: 249 }
      }
      const item = db[productName]
      if (!item)
        return JSON.stringify({ found: false, message: `未找到 ${productName} 的库存信息` })
      return JSON.stringify({
        found: true,
        productName,
        stock: item.stock,
        price: item.price,
        status: item.stock > 0 ? '有货' : '缺货'
      })
    },
    {
      name: 'check_inventory',
      description: '查询商品库存信息',
      schema: z.object({
        productName: z.string().describe('商品名称，例如 iPhone 16')
      })
    }
  )

  // 工具2 创建订单
  private createOrderTool = tool(
    async ({
      productName,
      quantity,
      customerName
    }: {
      productName: string
      quantity: number
      customerName: string
    }) => {
      const orderId = `ORD-${Date.now()}`
      return JSON.stringify({
        success: true,
        orderId,
        productName,
        quantity,
        customerName,
        createdAt: new Date().toLocaleString('zh-CN')
      })
    },
    {
      name: 'create_order',
      description: '为客户创建购买订单',
      schema: z.object({
        productName: z.string().describe('商品名称'),
        quantity: z.number().describe('购买数量'),
        customerName: z.string().describe('客户姓名')
      })
    }
  )

  // 工具3 查询订单状态
  private checkOrderTool = tool(
    async ({ orderId }: { orderId: string }) => {
      const statuses = ['待支付', '已支付', '备货中', '已发货', '已完成']
      return JSON.stringify({
        orderId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        updatedAt: new Date().toLocaleString('zh-CN')
      })
    },
    {
      name: 'check_order',
      description: '查询订单状态',
      schema: z.object({
        orderId: z.string().describe('订单号，格式 ORD-XXXXX')
      })
    }
  )

  async runFunctionCalling(userMessage: string) {
    const tools = [this.checkInventory, this.createOrderTool, this.checkOrderTool]
    const toolMap: Record<string, any> = {
      check_inventory: this.checkInventory,
      create_order: this.createOrderTool,
      check_order: this.checkOrderTool
    }

    const llmWithTools = this.llm.bindTools(tools)
    const messages: any[] = [new HumanMessage(userMessage)]
    const toolCallLog: any[] = []

    for (let round = 0; round < 3; round++) {
      const response = await llmWithTools.invoke(messages)
      messages.push(response)

      // 如果没有工具返回，说明需要直接返回了
      if (!response.tool_calls?.length) {
        return {
          userMessage,
          toolCalls: toolCallLog,
          finalAnswer: response.content || '处理完成'
        }
      }

      // 有工具调用，执行工具并将结果加入对话messages
      for (const toolCall of response.tool_calls) {
        const toolFn = toolMap[toolCall.name]
        if (!toolFn) continue

        const result = await toolFn.invoke(toolCall.args)
        toolCallLog.push({
          tool: toolCall.name,
          args: toolCall.args,
          result: JSON.parse(result) // 解析工具返回的 JSON 字符串
        })

        messages.push(
          new ToolMessage({
            content: result,
            tool_call_id: toolCall.id || ''
          })
        )
      }
    }

    const lastMsg = [...messages].reverse().find((m) => m.constructor.name === 'AIMessage')

    return {
      userMessage,
      toolCalls: toolCallLog,
      finalAnswer: lastMsg?.content || '处理完成'
    }
  }
}
