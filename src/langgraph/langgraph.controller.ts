import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from './article.service'

@Controller('langgraph')
export class LanggraphController {
  constructor(
    private readonly langgraphService: LanggraphService,
    private readonly articleService: ArticleService
  ) {}

  /* 工作流1 无记忆简单回答 */
  @Post('simple-chat')
  async simpleChat(@Body() body: { message: string }) {
    return this.langgraphService.simpleChat(body.message)
  }

  /* 工作流2 有记忆多轮对话 */
  @Post('memory-chat')
  memoryChat(@Body() body: { threadId: string; message: string }) {
    return this.langgraphService
      .memoryChat(body.threadId, body.message)
      .then((answer) => ({ answer }))
  }

  /* 工作流2 查看历史对话 */
  @Get('history/:threadId')
  getHistory(@Param('threadId') threadId: string) {
    return this.langgraphService.getHistory(threadId)
  }

  // 工作流三：文章摘要流水线
  @Post('article')
  processArticle(@Body() body: { article: string }) {
    return this.articleService.process(body.article)
  }
}
