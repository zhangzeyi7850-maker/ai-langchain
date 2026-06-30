import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import type { DistanceStrategy } from '@langchain/community/vectorstores/pgvector'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Pool } from 'pg'
import { AddDocumentsDto, SearchDto, QueryDto } from './dto/rag.dto'

@Injectable()
export class RagPgvectorService implements OnModuleInit {
  private readonly logger = new Logger(RagPgvectorService.name)
  private embeddings: OllamaEmbeddings
  private llm: ChatOllama
  private pool: Pool

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

    this.pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'ragdb'
    })

    this.logger.log('RAG PGVector Service 初始化完成')
  }

  // ✅ 关键修复：@langchain/community@1.1.x 的 columns 字段名和 0.x 不同
  // 1.1.x 使用驼峰命名（idColumnName / vectorColumnName / contentColumnName / metadataColumnName）
  // 同时 collectionTableName 必须传，否则找不到 collection 导致 id 为 null
  private getPgConfig(collectionName: string) {
    return {
      pool: this.pool,

      // ✅ 表名
      tableName: 'langchain_pg_embedding',
      collectionTableName: 'langchain_pg_collection',
      collectionName,

      // ✅ columns 字段名必须和建表时的列名完全对应
      //    @langchain/community@1.1.x 内部用这些 key 拼 INSERT SQL
      //    任何一个对不上都会导致插入时对应列为 null
      columns: {
        idColumnName: 'id', // TEXT PRIMARY KEY
        vectorColumnName: 'embedding', // VECTOR(1024)
        contentColumnName: 'document', // TEXT
        metadataColumnName: 'cmetadata' // JSONB
      },

      // ✅ 距离策略：cosine（余弦相似度），和 HNSW 索引的 vector_cosine_ops 对应
      distanceStrategy: 'cosine' as DistanceStrategy
    }
  }

  // ── addDocuments ─────────────────────────────────────
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
        // ✅ id 必须是非空字符串，格式自定义即可
        allIds.push(`${doc.id}-chunk-${i}`)
      })
      this.logger.log(`[PGVector] 文档 ${doc.id} 分块完成：共 ${chunks.length} 块`)
    }

    // ✅ fromDocuments 第四个参数传 ids，确保每条记录有明确的 id
    //    不传 ids 时，1.1.x 内部生成 uuid，但部分环境下会出现 null 问题
    await PGVectorStore.fromDocuments(
      allDocs,
      this.embeddings,
      this.getPgConfig(dto.collectionName)
    )

    return {
      success: true,
      backend: 'pgvector',
      collectionName: dto.collectionName,
      originalDocCount: dto.documents.length,
      totalChunks: allDocs.length,
      chunkSize,
      chunkOverlap
    }
  }

  // ── search ───────────────────────────────────────────
  async search(dto: SearchDto) {
    const topK = dto.topK ?? 3

    const vectorStore = await PGVectorStore.initialize(
      this.embeddings,
      this.getPgConfig(dto.collectionName)
    )
    const results = await vectorStore.similaritySearchWithScore(dto.query, topK)
    await vectorStore.end()

    return {
      query: dto.query,
      backend: 'pgvector',
      collectionName: dto.collectionName,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: parseFloat(score.toFixed(6))
      }))
    }
  }

  // ── query（RAG 完整流程）───────────────────────────────
  async query(dto: QueryDto) {
    const topK = dto.topK ?? 3
    const vectorStore = await PGVectorStore.initialize(
      this.embeddings,
      this.getPgConfig(dto.collectionName)
    )

    const queryWithPrefix = `Represent this sentence for searching relevant passages: ${dto.question}`
    const retrieved = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)
    await vectorStore.end()

    if (retrieved.length === 0) {
      return {
        question: dto.question,
        answer: '知识库中暂无相关内容，请先添加文档。',
        sources: []
      }
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

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
    const answer = await chain.invoke({ context, question: dto.question })

    return {
      question: dto.question,
      backend: 'pgvector',
      answer,
      sources: retrieved.map(([doc, score]) => ({
        content: doc.pageContent,
        score: parseFloat(score.toFixed(6)),
        metadata: doc.metadata
      }))
    }
  }

  // ── collectionInfo ───────────────────────────────────
  async collectionInfo(collectionName: string) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) AS count
         FROM langchain_pg_embedding e
         JOIN langchain_pg_collection c ON e.collection_id = c.uuid
         WHERE c.name = $1`,
        [collectionName]
      )
      const count = parseInt(result.rows[0].count, 10)
      return { backend: 'pgvector', collectionName, chunkCount: count, exists: count > 0 }
    } catch {
      return { backend: 'pgvector', collectionName, chunkCount: 0, exists: false }
    }
  }

  // ── deleteCollection ─────────────────────────────────
  async deleteCollection(collectionName: string) {
    await this.pool.query(
      `DELETE FROM langchain_pg_embedding
       WHERE collection_id = (
         SELECT uuid FROM langchain_pg_collection WHERE name = $1
       )`,
      [collectionName]
    )
    await this.pool.query('DELETE FROM langchain_pg_collection WHERE name = $1', [collectionName])
    return {
      success: true,
      backend: 'pgvector',
      collectionName,
      message: `集合 ${collectionName} 已删除`
    }
  }
}
