import { Controller } from '@nestjs/common'
import { McpClientService } from './mcp-client.service'

@Controller('mcp-client')
export class McpClientController {
  constructor(private readonly mcpClientService: McpClientService) {}
}
