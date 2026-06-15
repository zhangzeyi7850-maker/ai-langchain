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

  @Post('blog')
  generateBlog(@Body() body: { keyWords: string; style: string }) {
    // 生成关键词是keyWords，风格是style的博客文章
    const { keyWords, style } = body;
    return this.chainsService.generateBlog(keyWords, style);
  }
}
