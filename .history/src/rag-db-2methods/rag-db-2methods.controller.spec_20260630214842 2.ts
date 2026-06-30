import { Test, TestingModule } from '@nestjs/testing';
import { RagDbChromaController } from './rag-db-chroma.controller';

describe('RagDbChromaController', () => {
  let controller: RagDbChromaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagDbChromaController],
    }).compile();

    controller = module.get<RagDbChromaController>(RagDbChromaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
