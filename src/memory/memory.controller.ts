import { Controller, Param, Body, Res, Get, Post, Delete } from '@nestjs/common';
import { MemoryService } from './memory.service';
import type { Response } from 'express';
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

  @Post('chat-stream')
  chatStream(@Body() body: { sessionId: string; message: string }, @Res() res: Response) {
    return this.memoryService.chatStream(body.sessionId, body.message, res); // 这里为什么要传res对象？因为流式响应需要直接操作底层的响应对象，不能等到方法返回后由框架处理
  }
}
