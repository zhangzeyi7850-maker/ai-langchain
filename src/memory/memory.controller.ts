import { Controller, Param, Body, Get, Post, Delete } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post('chat')
  chat(@Body() body: { sessionId: string; message: string }) {
    return this.memoryService.chat(body.sessionId, body.message);
  }

  @Get('session/:sessionId')
  getHistory(@Param('sessionId') sessionId: string) {
    return this.memoryService.getHistory(sessionId);
  }
  // 删除对话历史
  @Delete('session/:sessionId')
  clearHistory(@Param('sessionId') sessionId: string) {
    return this.memoryService.clearHistory(sessionId);
  }

  @Get('sessions')
  listSessions() {
    return this.memoryService.listSessions();
  }
}
