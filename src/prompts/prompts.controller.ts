import { Controller, Body, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post('translate')
  translate(@Body() body: { text: string; targetLanguage: string }) {
    const { text, targetLanguage } = body;
    return this.promptsService.translate(text, targetLanguage);
  }

  @Post('summarize')
  summarize(@Body() body: { text: string; maxWords: number }) {
    const { text, maxWords } = body;
    return this.promptsService.summarize(text, maxWords);
  }

  @Post('classify')
  classify(@Body() body: { text: string }) {
    const { text } = body;
    return this.promptsService.classify(text);
  }

  @Post('code-review')
  codeReview(@Body() body: { code: string; language: string }) {
    const { code, language } = body;
    return this.promptsService.codeReview(code, language);
  }
}
