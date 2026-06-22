import { Injectable } from '@nestjs/common'
import { config } from '../config'
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters' // 文本分割器
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
/* 内存向量库，适合小规模数据，重启后数据会丢失 */
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
// 真实业务数据储存 pgvector
import { PGVectorStore, DistanceStrategy } from '@langchain/pgvector'
import { Pool } from 'pg'
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'
import { StringOutputParser } from '@langchain/core/output_parsers'

@Injectable()
export class RagDbService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512 // 本次回答最多生成512 tokens的内容
  })

  // 向量化模型
  private embeddings = new OllamaEmbeddings({
    model: config.ollama.embedModel,
    baseUrl: config.ollama.host
  })

  // 创建postgresql pgvector连接池
  private pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // 连接池最大连接数，根据业务需求调整，过大可能导致数据库压力过大，过小可能导致请求排队等待
    idleTimeoutMillis: 30000, // 连接最大空闲时间，30秒，超过这个时间的连接会被关闭，释放资源
    connectionTimeoutMillis: 2000 // 连接超时时间，2秒，如果连接数据库超过这个时间没有成功，就放弃连接，避免请求长时间挂起
  })

  private vectorStore: PGVectorStore | null = null

  private pgVectorStoreConfig = {
    pool: this.pgPool,
    collectionName: 'rag_knowledge-base', // 集合名称 类似命名空间 可以隔离不同的业务数据，避免表名冲突
    collectionTableName: 'langchain_pg_collection', // 存储集合信息的表名 这是一个集合了普通数据和向量数据的Table
    tableName: 'langchain_pg_embedding', // 向量表名
    columns: {
      idColumnName: 'id', // id列名
      vectorColumnName: 'embedding', // 向量列名
      contentColumnName: 'content', // 文本内容列名
      metadataColumnName: 'metadata' // 元数据列名
    },
    // 距离策略，pgvector支持三种距离计算方式：欧氏距离、内积、余弦相似度。根据业务需求选择合适的距离策略，余弦相似度适合文本向量比较。
    distanceStrategy: 'cosine' as DistanceStrategy // 使用余弦相似度计算向量距离
  }

  private docCount = 0 // 已加载的文档数量

  // 加载文档到向量库的方法
  async loadDocuments(documents: { id: string; content: string; source?: string }[]) {
    // 1. 文本分割
    const spliter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', '。', ' ', ''] // 优先按段落分割，再按行分割，最后按空格分割
    })

    // 2. 定义文档
    const allDocs: Document[] = []
    for (const doc of documents) {
      const chunks = await spliter.createDocuments(
        [doc.content],
        [{ id: doc.id, source: doc.source || doc.id }]
      )
      allDocs.push(...chunks)
    }

    // 使用pgvectorstore 存入pgvector数据库，
    // pgvectorstore.fromDocuments 内部会调用embeddings.embedDocuments方法把文本转成向量
    // 1. 首次调用，自动创建表结构 (langchain_pg_collection 存储集合信息，langchain_pg_embedding 存储向量数据和文本数据)
    // 2. 后续调用，文档数据插入 langchain_pg_collection表, 自动把向量数据插入 langchain_pg_embedding表
    this.vectorStore = await PGVectorStore.fromDocuments(
      allDocs,
      this.embeddings,
      this.pgVectorStoreConfig
    )
    this.docCount += documents.length // 更新已加载的文档数量

    // 4. 返回结果
    return {
      success: true,
      originalDocs: documents.length,
      totalChunks: allDocs.length,
      message: `加载${documents.length}个文档，分割成${allDocs.length}个块，并存入内存向量库中。`
    }
  }

  // 查询
  async getStatus() {
    try {
      // 查询 pgvector 数据库中已经储存的向量数量
      const results = await this.pgPool.query(
        `SELECT COUNT(*) FROM ${this.pgVectorStoreConfig.tableName} WHERE collection_id = (SELECT uuid FROM ${this.pgVectorStoreConfig.collectionTableName} WHERE name = $1)`,
        [this.pgVectorStoreConfig.collectionName] // $1的值  this.pgVectorStoreConfig.collectionName  根据集合名称过滤统计向量数量
      )
      const vectorCount = parseInt(results.rows[0].count, 10) // 已储存的向量数量

      return {
        mode: 'pgvector',
        loaded: vectorCount > 0,
        vectorCount,
        collection: this.pgVectorStoreConfig.collectionName,
        message:
          vectorCount > 0
            ? `PostgreSQL 向量数据库已加载 ${vectorCount} 个向量。`
            : 'PostgreSQL 向量数据库当前没有加载任何向量。'
      }
    } catch (error) {
      console.error('查询向量库状态失败:', error)
      return {
        mode: 'pgvector',
        loaded: false,
        vectorCount: 0,
        error: '查询向量库状态失败，请先调用/rag-db/load接口加载文档后再进行查询。'
      }
    }
  }

  // 获取或初始化 vectorStore（懒加载，复用同一个实例）
  private async getVectorStore(): Promise<PGVectorStore> {
    if (!this.vectorStore) {
      // 首次调用时才初始化，后续复用，不重复建立连接
      this.vectorStore = await PGVectorStore.initialize(this.embeddings, this.pgVectorStoreConfig)
    }
    return this.vectorStore
  }

  // 纯向量查询
  async search(query: string, topK = 3) {
    // 复用 vectorStore 实例，不再每次新建/销毁连接
    const vectorStore = await this.getVectorStore()

    const results = await vectorStore.similaritySearchWithScore(query, topK)

    // await this.vectorStore.end() // 结束连接，释放资源
    return {
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
        score: parseFloat(score.toFixed(4)), // 余弦距离，越小越相似
        similarity: parseFloat((1 - score).toFixed(4)) // 余弦相似度，越接近1表示越相似
      }))
    }
  }

  // 完整实现 的RAG问答接口
  async query(question: string, topK = 3) {
    // 复用 vectorStore 实例，不再每次新建/销毁连接
    const vectorStore = await this.getVectorStore()

    // 1. 检索
    const retrieved = await vectorStore.similaritySearchWithScore(question, topK)

    if (retrieved.length === 0) {
      return {
        question,
        answer: '没有找到相关的文档信息。',
        retrieved: []
      }
    }

    /*
    2. 过滤 返回score > 0.5， score是余弦距离
    */
    const filtered = retrieved.filter(([doc, score]) => score < 0.5)
    if (filtered.length === 0) {
      return {
        question,
        answer: '没有找到相关的文档信息。',
        retrieved: []
      }
    }

    const context = filtered.map(([doc], i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n') // 把检索到的内容拼成一个字符串，作为上下文提供给模型

    // 3. RAG prompt 严格限制模型只能用参考资料进行回答
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个知识库问答助手，严格基于参考资料回答。
        规则:
        1. 只能格努参考资料内容回答，不能使用资料外的知识。
        2. 资料中没有的相关信息，回答: "知识库中暂无相关内容"
        3. 回答简洁准确，禁止添加额外无关信息, 使用中文。
        参考资料: ${context}
      `
      ],
      ['human', `${question}`]
    ])

    // 4. 调用模型生成回答 prompt + retrieved(向量库检索出来的内容) 用来调用模型生成答案
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
    const answer = await chain.invoke({
      // invoke 参数是上面提示词中定义的 context 和 question
      context,
      question
    })

    return {
      question,
      answer,
      sources: retrieved.map(([doc, score]) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
        score: parseFloat(score.toFixed(4)), // 余弦距离
        similarity: parseFloat((1 - score).toFixed(4)) // 余弦相似度
      }))
    }
  }

  // 清空向量库
  async clearKnowledge() {
    // 删除当前collection 下面所有的向量数据和集合数据
    await this.pgPool.query(
      `DELETE FROM ${this.pgVectorStoreConfig.tableName} WHERE collection_id = (SELECT uuid FROM ${this.pgVectorStoreConfig.collectionTableName} WHERE name = $1)`,
      [this.pgVectorStoreConfig.collectionName]
    )
    await this.pgPool.query(
      `DELETE FROM ${this.pgVectorStoreConfig.collectionTableName} WHERE name = $1`,
      [this.pgVectorStoreConfig.collectionName]
    ) // 删除集合数据，触发级联删除向量数据

    this.docCount = 0 // 重置文档数量
    this.vectorStore = null // 重置向量库实例

    return {
      success: true,
      message: '已清空向量库，所有加载的文档数据已删除。'
    }
  }

  // nestjs应用关闭时会调用这个生命周期钩子函数 关闭pgPool连接池，释放资源
  async onModuleDestroy() {
    await this.pgPool.end()
    console.log('PostgreSQL连接池已关闭。')
  }
}
