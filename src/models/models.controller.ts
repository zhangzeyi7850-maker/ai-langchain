import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  // chat接口 普通调用
  @Post('chat')
  baseChat(@Body() { message }: { message: string }) {
    return this.modelsService.baseChat(message);
  }

  // 系统提示词
  @Post('chat-system')
  chatSystem(@Body() { system, message }: { system: string; message: string }) {
    return this.modelsService.chatSystem({ system, message });
  }

  // 流式输出
  @Post('chat-stream')
  chatStream(@Body() { message }: { message: string }, @Res() res: Response) {
    return this.modelsService.chatStream(message, res); // 把res也传过去
  }

  // pipeline StringOutputParser 方式调用，适合复杂的多轮对话场景
  @Post('chat-pipeline')
  chatWithParser(@Body() { message }: { message: string }) {
    // 这里可以定义一个更复杂的pipeline调用，适合多轮对话或者需要多个模型协同工作的场景
    // 例如，先用一个模型进行意图识别，再根据意图选择不同的回答模型，最后整合回答返回给用户
    return this.modelsService.chatWithParser(message);
  }
}
