import { Controller, Post, Body } from '@nestjs/common';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  // chat接口
  @Post('chat')
  baseChat(@Body() { message }: { message: string }) {
    return this.modelsService.baseChat(message);
  }

  @Post('chat-system')
  chatSystem(@Body() { system, message }: { system: string; message: string }) {
    return this.modelsService.chatSystem({ system, message });
  }
}
