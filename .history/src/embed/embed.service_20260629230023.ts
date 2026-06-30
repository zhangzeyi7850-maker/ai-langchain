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

  // 单条文本 embedding
  async embedSingle(text: string) {
    const vector = await this.embeddings.embedQuery(text)
    return {
      text,
      dimension: vector.length,
      vector
    }
  }
}
