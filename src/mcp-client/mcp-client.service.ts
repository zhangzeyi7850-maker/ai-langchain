import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client
  private transport: StdioClientTransport

  /* 模拟启动时链接MCP Server */
  async onModuleInit() {
    this.client = new Client({ name: 'nestjs-mcp-client', version: '1.0.0' }, { capabilities: {} })

    // stdio 模式 Nestjs以子进程方式启动MCP Server
    // McpClientService 使用 stdio 模式，在 NestJS 模块初始化时自动以子进程方式启动 MCP Server。
    this.transport = new StdioClientTransport({
      command: 'tsx',
      args: ['src/mcp-server/server.ts'], // MCP Server 的入口文件
      env: { ...process.env } as Record<string, string> // 把当前环境变量传给子进程 包括DATABASE_URL等
    })

    await this.client.connect(this.transport)
    console.log('MCP Client 已连接到MCP Server')
  }

  /* 获取所有可用工具列表 */
  async listTools() {
    const response = await this.client.listTools()
    return response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }

  /* 调用指定工具 */
  async callTool(toolName: string, arg: Record<string, any>) {
    const response = await this.client.callTool({
      name: toolName,
      arguments: arg
    })
    // mcp 响应里 content 是数组，取第一个text内容
    const textContent = (response.content as { type: string; text: string }[]).find(
      (c) => c.type === 'text'
    )
    return {
      tool: toolName,
      result: textContent?.text ?? '工具没有返回内容',
      isError: response.isError ?? false
    }
  }

  /* 应用退出时应断开与MCP Server的连接 */
  async onModuleDestroy() {
    await this.client.close()
    console.log('MCP Client 已断开连接')
  }
}
