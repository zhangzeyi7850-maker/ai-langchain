import { Module } from '@nestjs/common'
import { McpClientController } from './mcp-client.controller'
import { McpClientService } from './mcp-client.service'

@Module({
  controllers: [McpClientController],
  providers: [McpClientService],
  exports: [McpClientService] // 导出McpClientService，以便其他模块可以使用它
})
export class McpClientModule {}
