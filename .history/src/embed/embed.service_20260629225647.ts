import { Injectable } from '@nestjs/common'
import { OllamaEmbeddings } from '@langchain/ollama'

@Injectable()
export class EmbedService {
  private embeddings: OllamaEmbeddings

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: 'mxbai-embed-large',
      baseUrl: 'http://localhost:11434'
    })
  }
}
