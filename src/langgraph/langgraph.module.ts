import { Module } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from './article.service'
import { LanggraphController } from './langgraph.controller'
import { ReactAgentService } from './class-2-service/react-agent/react-agent.service'
import { RoutingService } from './class-2-service/routing/routing.service'
import { ParallelService } from './class-2-service/parallel/parallel.service'

@Module({
  providers: [LanggraphService, ArticleService, ReactAgentService, RoutingService, ParallelService],
  controllers: [LanggraphController],
  exports: [LanggraphService, ArticleService]
})
export class LanggraphModule {}
