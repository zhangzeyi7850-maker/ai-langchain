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
    const vector = await this.embeddings.embedQuery(text) // embedQuery 方法用于单条文本 embedding
    return {
      text,
      dimension: vector.length,
      vector
    }
  }

  // 批量文本
  async embedBatch(texts: string[]) {
    const vectors = await this.embeddings.embedDocuments(texts) // embedDocuments 方法用于批量文本 embedding
  }
}
