import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Pool } from 'pg'
import { AddDocumentsDto, SearchDto, QueryDto } from './dto/rag.dto'

// ── Chroma 相关 import（暂时注释，保留备用）──────────────
// import { Chroma } from '@langchain/community/vectorstores/chroma'

// ── pgvector 相关 import ──────────────────────────────────
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import type { DistanceStrategy } from '@langchain/community/vectorstores/pgvector'

@Injectable()
export class RagChromaService implements OnModuleInit {
  private readonly logger = new Logger(RagChromaService.name)
  private embeddings: OllamaEmbeddings
  private llm: ChatOllama
  private pool: Pool

  // ── Chroma 配置（暂时注释）────────────────────────────
  // private readonly chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000'

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

    // ── pgvector：初始化 PostgreSQL 连接池 ───────────────
    this.pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'ragdb'
    })

    this.logger.log('RAG Service 初始化完成（向量库：pgvector）')
  }

  // ── pgvector 配置对象 ─────────────────────────────────
  private getPgConfig(collectionName: string) {
    return {
      pool: this.pool,
      tableName: 'langchain_pg_embedding',
      collectionName,
      collectionTableName: 'langchain_pg_collection',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'document',
        metadataColumnName: 'cmetadata',
        collectionIdColumnName: 'collection_id'
      },
      distanceStrategy: 'cosine' as DistanceStrategy
    }
  }

  // ── Chroma：getVectorStore（暂时注释）────────────────
  // private async getVectorStore(collectionName: string): Promise<Chroma> {
  //   return Chroma.fromExistingCollection(this.embeddings, {
  //     collectionName,
  //     url: this.chromaUrl,
  //   })
  // }

  // ─────────────────────────────────────────────────────
  // addDocuments：文档分块 → 向量化 → 存入 pgvector
  // ─────────────────────────────────────────────────────
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
      this.logger.log(`[pgvector] 文档 ${doc.id} 分块完成：共 ${chunks.length} 块`)
    }

    // ── Chroma 写入（暂时注释）────────────────────────
    // await Chroma.fromDocuments(allDocs, this.embeddings, {
    //   collectionName: dto.collectionName,
    //   url:            this.chromaUrl,
    //   ids:            allIds,
    // })

    // ── pgvector 写入 ─────────────────────────────────
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

  // ─────────────────────────────────────────────────────
  // search：纯向量检索
  // ─────────────────────────────────────────────────────
  async search(dto: SearchDto) {
    const topK = dto.topK ?? 3

    // ── Chroma 检索（暂时注释）────────────────────────
    // const vectorStore = await this.getVectorStore(dto.collectionName)
    // const results     = await vectorStore.similaritySearchWithScore(dto.query, topK)

    // ── pgvector 检索 ─────────────────────────────────
    const vectorStore = await PGVectorStore.initialize(
      this.embeddings,
      this.getPgConfig(dto.collectionName)
    )
    const results = await vectorStore.similaritySearchWithScore(dto.query, topK)
    await vectorStore.end() // 释放连接

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

  // ─────────────────────────────────────────────────────
  // query：完整 RAG（检索 + LLM 生成）
  // ─────────────────────────────────────────────────────
  async query(dto: QueryDto) {
    const topK = dto.topK ?? 3

    // ── Chroma 检索（暂时注释）────────────────────────
    // const vectorStore = await this.getVectorStore(dto.collectionName)
    // const queryWithPrefix = `Represent this sentence for searching relevant passages: ${dto.question}`
    // const retrieved       = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)

    // ── pgvector 检索 ─────────────────────────────────
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

  // ─────────────────────────────────────────────────────
  // collectionInfo：查询集合信息
  // ─────────────────────────────────────────────────────
  async collectionInfo(collectionName: string) {
    // ── Chroma 查询（暂时注释）────────────────────────
    // try {
    //   const vectorStore = await this.getVectorStore(collectionName)
    //   const collection  = vectorStore.collection
    //   const count       = await collection.count()
    //   return { backend: 'chroma', collectionName, chunkCount: count, exists: true }
    // } catch {
    //   return { backend: 'chroma', collectionName, chunkCount: 0, exists: false }
    // }

    // ── pgvector 查询 ─────────────────────────────────
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

  // ─────────────────────────────────────────────────────
  // deleteCollection：删除集合
  // ─────────────────────────────────────────────────────
  async deleteCollection(collectionName: string) {
    // ── Chroma 删除（暂时注释）────────────────────────
    // const vectorStore = await this.getVectorStore(collectionName)
    // await vectorStore.delete({ filter: {} })
    // return { success: true, backend: 'chroma', collectionName, message: `集合 ${collectionName} 已清空` }

    // ── pgvector 删除 ─────────────────────────────────
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
