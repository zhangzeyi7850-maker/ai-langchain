import { Controller, Body, Post } from '@nestjs/common'
import { EmbedService } from './embed.service'
import { EmbedSingleDto, EmbedBatchDto, SimilarityDto } from './dto/embed.dto'

@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}
}
