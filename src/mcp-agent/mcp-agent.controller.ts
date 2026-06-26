import { Controller, Post, Get, Body } from '@nestjs/common'
import { McpAgentService } from './mcp-agent.service'

@Controller('mcp-agent')
export class McpAgentController {
  constructor(private readonly mcpAgentService: McpAgentService) {}

  // GET /mcp-agent/tools - 获取 MCP 工具列表
  @Get('tools')
  listTools() {
    return this.mcpAgentService.listMcpTools()
  }

  // POST /mcp-agent/run - langchain Agent 执行 MCP 工具
  @Post('run')
  async runAgent(@Body('message') userMessage: string) {
    return this.mcpAgentService.runAgent(userMessage)
  }
}
