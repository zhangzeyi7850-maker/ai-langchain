import { Controller, Body, Post } from '@nestjs/common'
import { EmbedService } from './embed.service'
import { EmbedSingleDto, EmbedBatchDto, SimilarityDto } from './dto/embed.dto'

@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  // POST /embed/single
  @Post('single')
  async embedSingle(@Body() dto: EmbedSingleDto) {
    return this.embedService.embedSingle(dto.text)
  }
}
