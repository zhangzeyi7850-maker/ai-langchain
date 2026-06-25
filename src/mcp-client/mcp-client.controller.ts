import { Controller, Post, Get, Body } from '@nestjs/common'
import { McpClientService } from './mcp-client.service'

@Controller('mcp')
export class McpClientController {
  constructor(private readonly mcpClientService: McpClientService) {}

  // GET  /mcp/tools
  @Get('tools')
  listTools() {
    return this.mcpClientService.listTools()
  }

  @Post('call')
  callTool(@Body() body: { tool: string; args: Record<string, any> }) {
    return this.mcpClientService.callTool(body.tool, body.args)
  }
}
