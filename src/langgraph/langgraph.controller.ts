import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from './article.service'
import { ReactAgentService } from './class-2-service/react-agent/react-agent.service'
import { RoutingService } from './class-2-service/routing/routing.service'
import { ParallelService } from './class-2-service/parallel/parallel.service'
import { SupervisorService } from './class-3/supervisor/supervisor.service'
import { PipelineService } from './class-3/pipeline/pipeline.service'
import { CodeReviewService } from './class-3/code-review/code-review.service'
import { EmailApprovalService } from './class-4/email-approval/email-approval.service'

@Controller('langgraph')
export class LanggraphController {
  constructor(
    private readonly langgraphService: LanggraphService,
    private readonly articleService: ArticleService,
    private readonly reactAgentService: ReactAgentService,
    private readonly routingService: RoutingService,
    private readonly parallelService: ParallelService,
    private readonly supervisorService: SupervisorService,
    private readonly pipelineService: PipelineService,
    private readonly codeReviewService: CodeReviewService,
    private readonly emailApprovalService: EmailApprovalService
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

  /* 第二章接口 */
  @Post('react-chat')
  reactChat(@Body() body: { threadId: string; message: string }) {
    return this.reactAgentService.chat(body.threadId, body.message).then((answer) => ({ answer }))
  }

  @Post('route')
  route(@Body() body: { input: string }) {
    return this.routingService.handle(body.input)
  }

  @Post('parallel')
  parallel(@Body() body: { task: string }) {
    return this.parallelService.parallelChat(body.task)
  }

  /* 第三章接口 */
  @Post('supervisor')
  supervisor(@Body() body: { input: string }) {
    return this.supervisorService.run(body.input)
  }

  @Post('pipeline')
  pipeline(@Body() body: { topic: string }) {
    return this.pipelineService.createContent(body.topic)
  }

  @Post('code-review')
  codeReview(@Body() body: { code: string; language: string }) {
    return this.codeReviewService.review(body.code, body.language)
  }

  /* 第四章接口 */
  @Post('email/start')
  emailStart(@Body() body: { request: string; threadId: string }) {
    return this.emailApprovalService.start(body.request, body.threadId)
  }

  @Post('email/:threadId/approve')
  emailApprove(@Param('threadId') threadId: string) {
    return this.emailApprovalService.approve(threadId)
  }

  @Post('email/:threadId/reject')
  emailReject(@Param('threadId') threadId: string) {
    return this.emailApprovalService.reject(threadId)
  }

  @Post('email/:threadId/modify')
  emailModify(@Param('threadId') threadId: string, @Body() body: { feedback: string }) {
    return this.emailApprovalService.requestModify(threadId, body.feedback)
  }

  @Get('email/:threadId/state')
  emailState(@Param('threadId') threadId: string) {
    return this.emailApprovalService.getState(threadId)
  }
}
