import { Module } from '@nestjs/common'
import { RagController } from './rag-db-chroma.controller'
import { RagChromaService } from './rag-chroma.service'
import { RagPgvectorService } from './rag-pgvector.service'

@Module({
  controllers: [RagController],
  providers: [RagChromaService, RagPgvectorService]
})
export class RagModule {}
