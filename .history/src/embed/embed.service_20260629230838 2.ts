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

  /* 1, 单条文本 embedding */
  async embedSingle(text: string) {
    const vector = await this.embeddings.embedQuery(text) // embedQuery 方法用于单条文本 embedding
    return {
      text,
      dimension: vector.length,
      vector
    }
  }

  /* 2. 批量文本 */
  async embedBatch(texts: string[]) {
    const vectors = await this.embeddings.embedDocuments(texts) // embedDocuments 方法用于批量文本 embedding
    return texts.map((text, index) => ({
      index,
      text,
      dimension: vectors[index].length,
      vector: vectors[index]
    }))
  }

  /* 3. 相似度计算 (余弦相似度) */
  async similarity(query: string, documents: string[]) {
    // 查询向量：加上检索前缀 query 就是检索前缀
    const queryVector = await this.embeddings.embedQuery(
      `Represent this sentence for searching relevant passages: ${query}`
    )

    // 文档向量，直接 embed
    const docVectors = await this.embeddings.embedDocuments(documents)
  }
}
