import { Module } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from './article.service'
import { LanggraphController } from './langgraph.controller'
import { ReactAgentService } from './class-2-service/react-agent/react-agent.service'
import { RoutingService } from './class-2-service/routing/routing.service'
import { ParallelService } from './class-2-service/parallel/parallel.service'
import { SupervisorService } from './class-3/supervisor/supervisor.service'
import { PipelineService } from './class-3/pipeline/pipeline.service'
import { CodeReviewService } from './class-3/code-review/code-review.service'
import { EmailApprovalService } from './class-4/email-approval/email-approval.service'
import { TechResearchModule } from './class-5/tech-research.module'

@Module({
  imports: [TechResearchModule],
  providers: [
    LanggraphService,
    ArticleService,
    ReactAgentService,
    RoutingService,
    ParallelService,
    SupervisorService,
    PipelineService,
    CodeReviewService,
    EmailApprovalService
  ],
  controllers: [LanggraphController],
  exports: [
    LanggraphService,
    ArticleService,
    ReactAgentService,
    RoutingService,
    ParallelService,
    EmailApprovalService
  ] // 这里添加的服务就能在其他模块直接使用了
})
export class LanggraphModule {}
