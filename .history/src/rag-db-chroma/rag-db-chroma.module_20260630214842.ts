import { Module } from '@nestjs/common';
import { RagDbChromaService } from './rag-db-chroma.service';
import { RagDbChromaController } from './rag-db-chroma.controller';

@Module({
  providers: [RagDbChromaService],
  controllers: [RagDbChromaController]
})
export class RagDbChromaModule {}
