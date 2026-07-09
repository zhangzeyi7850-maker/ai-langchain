import { Module } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from './article.service'
import { LanggraphController } from './langgraph.controller'

@Module({
  providers: [LanggraphService, ArticleService],
  controllers: [LanggraphController],
  exports: [LanggraphService, ArticleService]
})
export class LanggraphModule {}
