import { Injectable } from '@nestjs/common'
import { OllamaEmbeddings } from '@langchain/ollama'

@Injectable()
export class EmbedService {
  private embeddings: OllamaEmbeddings

  constructor() {
    // 这是一个本地部署的 Ollama Embeddings 服务，使用 mxbai-embed-large 模型
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

    // 计算余弦相似度
    const scores = docVectors.map((docVc, i) => {
      const score = this.cosineSimilarity(queryVector, docVc)
      return {
        index: i,
        text: documents[i],
        score: parseFloat(score.toFixed(6))
      }
    })

    // 按照相似度降序排列
    scores.sort((a, b) => b.score - a.score)
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dot = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0)
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0))
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0))
    return dot / (normA * normB)
  }
}
