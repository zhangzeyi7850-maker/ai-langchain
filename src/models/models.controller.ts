import { Controller, Post } from '@nestjs/common';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  // chat接口
  @Post('chat')
  baseChat() {
    return this.modelsService.baseChat();
  }
}
