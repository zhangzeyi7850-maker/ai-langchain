import { Controller } from '@nestjs/common'
import { EmbedService } from './embed.service'

@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}
}
