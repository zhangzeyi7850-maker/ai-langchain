import { Injectable } from '@nestjs/common';
import { config } from '../config';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'; // 文本分割器
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'; // 内存向量库，适合小规模数据，重启后数据会丢失
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false, // 思考过程，false，推理过程省略掉，免得在调用时会卡
    numPredict: 512, // 本次回答最多生成512 tokens的内容
  });

  // 向量化模型
  private embeddings = new OllamaEmbeddings({
    model: config.ollama.embedModel,
    baseUrl: config.ollama.host,
  });

  // 内存向量库，先不使用真实数据库。 null表示未初始化
  private vectorStore: MemoryVectorStore | null = null;
  private docCount = 0; // 已加载的文档数量

  // 加载文档到向量库的方法
  async loadDocuments(documents: { id: string; content: string; source?: string }[]) {
    // 1. 文本分割
    const spliter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', '。', ' ', ''], // 优先按段落分割，再按行分割，最后按空格分割
    });

    // 2. 定义文档
    const allDocs: Document[] = [];
    for (const doc of documents) {
      const chunks = await spliter.createDocuments(
        [doc.content],
        [{ id: doc.id, source: doc.source || doc.id }],
      );
      allDocs.push(...chunks);
    }

    // 3. 内部调用 MemoryVectorStore 的 addDocuments 方法，进行向量化并存储
    // fromDocuments 批量向量化所有的文档块存入内存的向量库中
    this.vectorStore = await MemoryVectorStore.fromDocuments(allDocs, this.embeddings);
    this.docCount = documents.length; // 更新已加载的文档数量

    // 4. 返回结果
    return {
      success: true,
      originalDocs: documents.length,
      totalChunks: allDocs.length,
      message: `加载${documents.length}个文档，分割成${allDocs.length}个块，并存入内存向量库中。`,
    };
  }

  // 查询
  async getStatus() {
    return {
      loaded: !!this.vectorStore,
      docCount: this.docCount,
      message: this.vectorStore ? `已加载${this.docCount}个文档` : '尚未加载任何文档。',
    };
  }

  // 纯向量查询
  async search(query: string, topK = 3) {
    if (!this.vectorStore) {
      return {
        error: `请先调用 /rag/load 接口加载文档后再进行查询。`,
      };
    }

    /**
     * similaritySearchWithScore
     * 1. 把query参数也向量化，(调用embedding.embedQuery方法)
     * 2. 和向量库中所有文档的向量进行相似度计算
     * 3. 找出最相似的topK个文档块，返回它们的内容和相似度分数
     */
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    return {
      query,
      results: results.map(([doc, sorce]) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
        sorce: parseFloat(sorce.toFixed(4)), // 保留4位小数,0-1，越接近1表示越相似
      })),
    };
  }

  // 完整实现 的RAG问答接口
  async query(question: string, topK = 3) {
    if (!this.vectorStore) {
      return {
        error: `请先调用 /rag/load 接口加载文档后再进行查询。`,
      };
    }

    // 1. 检索
    const retrieved = await this.vectorStore.similaritySearchWithScore(question, topK);

    if (retrieved.length === 0) {
      return {
        question,
        answer: '没有找到相关的文档信息。',
        retrieved: [],
      };
    }

    /* 
    2. 把检索结果 拼成content 字符串  
      [1]第一块内容\n\n [2]第二块内容...
      编号 方便模型在回答引用  根据1  根据2
    */
    const context = retrieved
      .map(([doc], index) => `[${index + 1}] ${doc.pageContent}`)
      .join('\n\n');

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
      `,
      ],
      ['human', `${question}`],
    ]);

    // 4. 调用模型生成回答 prompt + retrieved(向量库检索出来的内容) 用来调用模型生成答案
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({
      // invoke 参数是上面提示词中定义的 context 和 question
      context,
      question,
    });

    return {
      question,
      answer,
      sources: retrieved.map(([doc, sorce]) => ({
        content: doc.pageContent,
        source: doc.metadata.source,
        sorce: parseFloat(sorce.toFixed(4)), // 保留4位小数,0-1，越接近1表示越相似
      })),
    };
  }

  // 清空向量库
  async clearKnowledge() {
    this.vectorStore = null; // 重置向量库实例
    this.docCount = 0; // 重置文档计数
    return {
      success: true,
      message: '已清空向量库，所有加载的文档数据已删除。',
    };
  }
}
