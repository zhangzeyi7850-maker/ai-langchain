import { Test, TestingModule } from '@nestjs/testing';
import { RagDbChromaService } from './rag-db-chroma.service';

describe('RagDbChromaService', () => {
  let service: RagDbChromaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagDbChromaService],
    }).compile();

    service = module.get<RagDbChromaService>(RagDbChromaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
