import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama'
// ✅ @langchain/community@1.x 的 Chroma 导入路径没有变化
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
// ✅ 1.x 新增：RunnablePassthrough 等工具从 runnables 导入
import { RunnablePassthrough } from '@langchain/core/runnables'
import { AddDocumentsDto, SearchDto, QueryDto } from './dto/rag.dto'

@Injectable()
export class RagChromaService implements OnModuleInit {
  private readonly logger = new Logger(RagChromaService.name)
  private embeddings: OllamaEmbeddings
  private llm: ChatOllama
  private readonly chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000'

  onModuleInit() {
    this.embeddings = new OllamaEmbeddings({
      model: 'mxbai-embed-large',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    })

    this.llm = new ChatOllama({
      model: 'qwen3.5:0.8b',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      temperature: 0.3
    })

    this.logger.log('RAG Chroma Service 初始化完成')
  }

  private async getVectorStore(collectionName: string): Promise<Chroma> {
    // ✅ @langchain/community@1.x：Chroma.fromExistingCollection 签名无变化
    return Chroma.fromExistingCollection(this.embeddings, {
      collectionName,
      url: this.chromaUrl
    })
  }

  async addDocuments(dto: AddDocumentsDto) {
    const chunkSize = dto.chunkSize ?? 500
    const chunkOverlap = dto.chunkOverlap ?? 50

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '。', '！', '？', '；', ' ', '']
    })

    const allDocs: Document[] = []
    const allIds: string[] = []

    for (const doc of dto.documents) {
      const chunks = await splitter.createDocuments(
        [doc.content],
        [{ ...doc.metadata, sourceId: doc.id }]
      )
      chunks.forEach((chunk, i) => {
        chunk.metadata.chunkIndex = i
        chunk.metadata.totalChunks = chunks.length
        allDocs.push(chunk)
        allIds.push(`${doc.id}-chunk-${i}`)
      })
      this.logger.log(`[Chroma] 文档 ${doc.id} 分块完成：共 ${chunks.length} 块`)
    }

    await Chroma.fromDocuments(allDocs, this.embeddings, {
      collectionName: dto.collectionName,
      url: this.chromaUrl,
      ids: allIds
    })

    return {
      success: true,
      backend: 'chroma',
      collectionName: dto.collectionName,
      originalDocCount: dto.documents.length,
      totalChunks: allDocs.length,
      chunkSize,
      chunkOverlap
    }
  }

  async search(dto: SearchDto) {
    const topK = dto.topK ?? 3
    const vectorStore = await this.getVectorStore(dto.collectionName)
    const results = await vectorStore.similaritySearchWithScore(dto.query, topK)

    return {
      query: dto.query,
      backend: 'chroma',
      collectionName: dto.collectionName,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: parseFloat(score.toFixed(6))
      }))
    }
  }

  async query(dto: QueryDto) {
    const topK = dto.topK ?? 3
    const vectorStore = await this.getVectorStore(dto.collectionName)

    const queryWithPrefix = `Represent this sentence for searching relevant passages: ${dto.question}`
    const retrieved = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)

    if (retrieved.length === 0) {
      return { question: dto.question, answer: '知识库中暂无相关内容，请先添加文档。', sources: [] }
    }

    const context = retrieved.map(([doc], i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n')

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是专业的知识库问答助手。严格根据参考资料回答问题，无相关内容时直接回答"知识库中暂无相关内容"，不要编造。

参考资料：
{context}`
      ],
      ['human', '{question}']
    ])

    // ✅ @langchain/core@1.x 的 LCEL pipe 用法与 0.x 一致
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
    const answer = await chain.invoke({ context, question: dto.question })

    return {
      question: dto.question,
      backend: 'chroma',
      answer,
      sources: retrieved.map(([doc, score]) => ({
        content: doc.pageContent,
        score: parseFloat(score.toFixed(6)),
        metadata: doc.metadata
      }))
    }
  }

  async collectionInfo(collectionName: string) {
    try {
      const vectorStore = await this.getVectorStore(collectionName)
      const collection = vectorStore.collection
      const count = await collection.count()
      return { backend: 'chroma', collectionName, chunkCount: count, exists: true }
    } catch {
      return { backend: 'chroma', collectionName, chunkCount: 0, exists: false }
    }
  }

  async deleteCollection(collectionName: string) {
    const vectorStore = await this.getVectorStore(collectionName)
    await vectorStore.delete({ filter: {} })
    return {
      success: true,
      backend: 'chroma',
      collectionName,
      message: `集合 ${collectionName} 已清空`
    }
  }
}
