import { Controller, Post, Body } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Post('polish')
  polish(@Body() body: { article: string }) {
    const { article } = body;
    return this.chainsService.polish(article);
  }
}
