// ============================================================
// src/rag/rag.service.ts
// RAG 核心服务层
// 包含完整 RAG 流程的所有业务逻辑：
//   1. 文档分块 + 向量化 + 存入 Chroma
//   2. 纯向量检索（返回 score）
//   3. 检索 + Qwen 生成回答（完整 RAG）
//   4. 集合信息查询
//   5. 集合删除
// ============================================================

// Injectable：标记为可注入的服务
// OnModuleInit：NestJS 生命周期接口，模块初始化完成后自动调用 onModuleInit()
// Logger：NestJS 内置日志工具，比 console.log 更规范，带有模块名前缀
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'

// OllamaEmbeddings：文本向量化，调用 mxbai-embed-large 模型
// ChatOllama：对话生成，调用 qwen2.5 模型
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama'

// Chroma：LangChain 封装的 Chroma 向量数据库客户端
// 提供 fromDocuments（存入）和 fromExistingCollection（读取）方法
import { Chroma } from '@langchain/community/vectorstores/chroma'

// RecursiveCharacterTextSplitter：递归字符文本分块器
// 按优先级依次尝试不同分隔符，尽量保证每个块在语义上完整
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// Document：LangChain 的文档类型，包含 pageContent（文本）和 metadata（元数据）
import { Document } from '@langchain/core/documents'

// StringOutputParser：把大模型返回的消息对象解析成普通字符串
import { StringOutputParser } from '@langchain/core/output_parsers'

// ChatPromptTemplate：构建对话型 Prompt 的模板类
// fromMessages 方法接收 [role, content] 数组，分别对应 system 和 user 消息
import { ChatPromptTemplate } from '@langchain/core/prompts'

// 导入 DTO 类型
import { AddDocumentsDto, SearchDto, QueryDto } from './dto/rag.dto'

// 导入集中配置
import { config } from '../config'

// @Injectable() 声明这个类可以被依赖注入
// implements OnModuleInit 表示这个类实现了 NestJS 的生命周期接口
@Injectable()
export class RagService implements OnModuleInit {
  // NestJS 内置日志实例，'RagService' 是日志的模块标识前缀
  // 输出格式示例：[RagService] RAG Service 初始化完成 ✅
  private readonly logger = new Logger(RagService.name)

  // 向量化模型实例（使用 mxbai-embed-large）
  private embeddings: OllamaEmbeddings

  // 对话大模型实例（使用 qwen2.5）
  private llm: ChatOllama

  // ──────────────────────────────────────────────────────
  // 生命周期钩子：onModuleInit
  // NestJS 在模块初始化完成后自动调用这个方法
  // 比 constructor 更适合做异步初始化，这里用来初始化 AI 模型实例
  // ──────────────────────────────────────────────────────
  onModuleInit() {
    // 初始化向量化模型
    // OllamaEmbeddings 内部会调用 Ollama 的 /api/embed 接口
    this.embeddings = new OllamaEmbeddings({
      model: config.ollama.embedModel, // 'mxbai-embed-large'
      baseUrl: config.ollama.host // 'http://localhost:11434'
    })

    // 初始化对话大模型
    // ChatOllama 内部会调用 Ollama 的 /api/chat 接口
    this.llm = new ChatOllama({
      model: config.ollama.chatModel, // 'qwen2.5:7b'
      baseUrl: config.ollama.host, // 'http://localhost:11434'
      // temperature 控制回答的"随机性"
      // 0.3 = 比较保守，适合知识库问答（要求准确）
      temperature: config.ollama.temperature
    })

    // 打印初始化成功日志
    this.logger.log('RAG Service 初始化完成 ✅')
    this.logger.log(`向量模型：${config.ollama.embedModel}`)
    this.logger.log(`对话模型：${config.ollama.chatModel}`)
    this.logger.log(`Chroma 地址：${config.chroma.url}`)
  }

  // ──────────────────────────────────────────────────────
  // 私有方法：getVectorStore
  // 获取一个已存在的 Chroma 集合（相当于"打开一张表"）
  // 每次需要读取向量库时调用这个方法
  // ──────────────────────────────────────────────────────
  private async getVectorStore(collectionName: string): Promise<Chroma> {
    // fromExistingCollection：连接到已存在的集合
    // 如果集合不存在会抛出异常，调用方需要处理
    return Chroma.fromExistingCollection(this.embeddings, {
      collectionName, // Chroma 中的集合名，相当于表名
      url: config.chroma.url // Chroma 服务地址
    })
  }

  // ──────────────────────────────────────────────────────
  // 方法 1：addDocuments
  // 把原始文档分块、向量化，存入 Chroma
  //
  // 完整流程：
  //   原始文档 → RecursiveCharacterTextSplitter 分块
  //           → 每个块加上 metadata（sourceId、chunkIndex）
  //           → OllamaEmbeddings 向量化
  //           → Chroma.fromDocuments 存入向量库
  // ──────────────────────────────────────────────────────
  async addDocuments(dto: AddDocumentsDto) {
    // 读取分块配置，优先使用请求体中的值，没有则用 config 默认值
    const chunkSize = dto.chunkSize ?? config.splitter.chunkSize
    const chunkOverlap = dto.chunkOverlap ?? config.splitter.chunkOverlap

    // 初始化递归字符分块器
    // "递归"的含义：先尝试第一个分隔符（'\n\n'），如果块还是太大，
    // 再尝试下一个（'\n'），依此类推，直到块大小满足要求
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize, // 每块最大字符数
      chunkOverlap, // 相邻块重叠字符数，防止语义在边界被切断

      // 分隔符优先级列表（从高到低）：
      //   '\n\n' → 段落（最优，保留完整段落语义）
      //   '\n'   → 换行（次优）
      //   '。！？；' → 中文句子结束符（保留完整句子）
      //   ' '    → 英文单词边界
      //   ''     → 最后手段：强制按字符数切
      separators: config.splitter.separators
    })

    // 准备存入 Chroma 的文档数组和 ID 数组
    const allDocs: Document[] = []
    const allIds: string[] = []

    // 逐个处理每篇原始文档
    for (const doc of dto.documents) {
      // createDocuments：把一段文本切成多个 Document 对象
      // 第一个参数：文本数组（这里每次只处理一篇，所以是单元素数组）
      // 第二个参数：对应的 metadata 数组，会附加到每个分块上
      const chunks = await splitter.createDocuments(
        [doc.content],
        [{ ...doc.metadata, sourceId: doc.id }] // 把原始 id 存到 metadata.sourceId
      )

      // 给每个分块补充位置信息，并生成唯一 ID
      chunks.forEach((chunk, index) => {
        // 记录这个块是第几块（从 0 开始），方便调试时定位
        chunk.metadata.chunkIndex = index

        // 记录这篇文档总共分了几块，方便展示
        chunk.metadata.totalChunks = chunks.length

        allDocs.push(chunk)

        // 分块 ID 格式：原始文档ID-chunk-块序号
        // 例如：'doc-001-chunk-0'、'doc-001-chunk-1'
        allIds.push(`${doc.id}-chunk-${index}`)
      })

      // 打印每篇文档的分块结果，录视频时终端可以看到这行日志
      this.logger.log(`文档 [${doc.id}] 分块完成：共 ${chunks.length} 块（chunkSize=${chunkSize}）`)
    }

    // fromDocuments：把所有分块一次性存入 Chroma
    // 内部流程：
    //   1. 调用 OllamaEmbeddings.embedDocuments() 批量向量化
    //   2. 把 (向量, 文本, metadata, id) 存入指定集合
    // 注意：每次调用都是"追加"，不是"覆盖"
    // 如果需要覆盖，先调用 deleteCollection 再重新存
    await Chroma.fromDocuments(allDocs, this.embeddings, {
      collectionName: dto.collectionName, // 存入哪个集合
      url: config.chroma.url, // Chroma 服务地址
      ids: allIds // 每个分块的唯一 ID
    })

    // 返回存入结果摘要
    return {
      success: true,
      collectionName: dto.collectionName,
      originalDocCount: dto.documents.length, // 原始文档数量
      totalChunks: allDocs.length, // 实际存入的分块总数
      chunkSize,
      chunkOverlap,
      ids: allIds // 所有分块的 ID 列表
    }
  }

  // ──────────────────────────────────────────────────────
  // 方法 2：search
  // 纯向量检索，不经过大模型
  // 流程：用户 query → embedQuery 向量化 → Chroma 余弦相似度检索 → 返回 Top K
  // ──────────────────────────────────────────────────────
  async search(dto: SearchDto) {
    const topK = dto.topK ?? config.rag.defaultTopK

    // 获取向量库集合实例
    const vectorStore = await this.getVectorStore(dto.collectionName)

    // similaritySearchWithScore：检索并返回相似度分数
    // 内部会把 dto.query 向量化，然后在集合中找最近的 topK 个向量
    // 返回值：[Document, score][] 数组，score 是余弦相似度（越高越相似）
    const results = await vectorStore.similaritySearchWithScore(dto.query, topK)

    return {
      query: dto.query,
      collectionName: dto.collectionName,
      // 解构 [doc, score] 并格式化返回
      results: results.map(([doc, score]) => ({
        content: doc.pageContent, // 分块的原始文本
        metadata: doc.metadata, // 分块的元数据（含 sourceId、chunkIndex 等）
        score: parseFloat(score.toFixed(6)) // 保留 6 位小数
      }))
    }
  }

  // ──────────────────────────────────────────────────────
  // 方法 3：query
  // 完整 RAG 流程（核心方法）
  //
  // 详细流程：
  //   Step 1：问题向量化（加检索前缀）
  //   Step 2：Chroma 相似度检索，取 Top K 文档
  //   Step 3：把检索到的文档拼装成 context 字符串
  //   Step 4：构建 Prompt（system 含 context，human 是问题）
  //   Step 5：Qwen 大模型根据 context 生成回答
  //   Step 6：返回 answer + sources（来源文档）
  // ──────────────────────────────────────────────────────
  async query(dto: QueryDto) {
    const topK = dto.topK ?? config.rag.defaultTopK

    // 打开向量库集合
    const vectorStore = await this.getVectorStore(dto.collectionName)

    // Step 1：检索时加上 queryPrefix，提升检索精度
    // 注意：存文档时不加前缀，查询时才加
    // 这是 mxbai-embed-large 模型的官方最佳实践
    const queryWithPrefix = `${config.rag.queryPrefix}${dto.question}`

    // Step 2：向量检索，返回最相关的 topK 个文档块
    const retrieved = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)

    // 如果知识库里没有相关内容，直接返回提示，不调用大模型（节省资源）
    if (retrieved.length === 0) {
      return {
        question: dto.question,
        answer: '知识库中暂无相关内容，请先添加文档。',
        sources: []
      }
    }

    // Step 3：把检索到的文档拼装成 context 字符串
    // 格式：[1] 第一条文档内容\n\n[2] 第二条文档内容
    // 编号方便模型在回答时引用，例如"根据[1]..."
    const context = retrieved.map(([doc], i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n')

    // Step 4：构建对话 Prompt
    // ChatPromptTemplate.fromMessages 接收消息数组
    // 每个消息是 [role, content] 格式：
    //   'system'：系统消息，设定助手的角色和行为规范
    //   'human'：用户消息，这里是用户的问题
    // {context} 和 {question} 是模板占位符，invoke 时会替换
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        // system 消息：告诉模型它是"知识库问答助手"
        // 明确规定：只能依据参考资料回答，不能使用资料外的知识
        // 这是降低幻觉的核心手段：给模型设定边界
        `你是一个专业的知识库问答助手。请严格根据下面的参考资料回答用户问题。

规则：
1. 只根据参考资料内容作答，不要使用资料之外的知识
2. 如果参考资料中没有相关信息，直接回答"知识库中暂无相关内容"
3. 回答要简洁、准确，使用中文
4. 可以指出答案来自第几条参考资料

参考资料：
{context}`
      ],
      [
        'human',
        // human 消息：用户的实际问题，从 invoke 时传入
        '{question}'
      ]
    ])

    // Step 5：构建 LangChain 调用链（Chain）
    // pipe 是管道操作符，数据从左向右流动：
    //   prompt              → 格式化成消息数组
    //   → this.llm          → 发给 Qwen 生成响应对象（AIMessage）
    //   → StringOutputParser → 从响应对象中取出纯文本字符串
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())

    // invoke：传入模板变量，触发整个链的执行
    // {context} 替换为检索到的文档内容
    // {question} 替换为用户的问题
    const answer = await chain.invoke({
      context,
      question: dto.question
    })

    // Step 6：返回结构化结果
    return {
      question: dto.question, // 原始问题
      answer, // Qwen 生成的回答文本
      // sources：检索到的来源文档，返回给前端展示"答案依据"
      sources: retrieved.map(([doc, score]) => ({
        content: doc.pageContent, // 原始文本片段
        score: parseFloat(score.toFixed(6)), // 相似度分数
        metadata: doc.metadata // 来源信息（sourceId、chunkIndex 等）
      }))
    }
  }

  // ──────────────────────────────────────────────────────
  // 方法 4：collectionInfo
  // 查询集合基本信息（主要是文档块数量）
  // 用途：存入文档后确认数量，或检查集合是否存在
  // ──────────────────────────────────────────────────────
  async collectionInfo(collectionName: string) {
    try {
      const vectorStore = await this.getVectorStore(collectionName)

      // vectorStore.collection 是底层的 Chroma 原生集合对象
      // count() 返回集合中存储的向量数量（即分块总数）
      const collection = vectorStore.collection
      const count = await collection.count()

      return {
        collectionName,
        chunkCount: count, // 集合中的分块总数
        exists: true
      }
    } catch {
      // getVectorStore 找不到集合时会抛异常，捕获后返回 exists: false
      return {
        collectionName,
        chunkCount: 0,
        exists: false
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // 方法 5：deleteCollection
  // 清空指定集合中的所有数据
  // 用途：重新存入文档前先清空，避免重复数据
  // ──────────────────────────────────────────────────────
  async deleteCollection(collectionName: string) {
    const vectorStore = await this.getVectorStore(collectionName)

    // delete：删除满足条件的文档
    // filter: {} 表示删除全部（空过滤条件 = 匹配所有）
    await vectorStore.delete({ filter: {} })

    return {
      success: true,
      collectionName,
      message: `集合 ${collectionName} 已清空`
    }
  }
}
