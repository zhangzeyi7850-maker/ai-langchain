import { Body, Controller, Delete, Get, Post } from '@nestjs/common'
import { RagDbService } from './rag-db.service'

@Controller('rag-db')
export class RagDbController {
  constructor(private readonly ragDbService: RagDbService) {}

  // 存文档
  @Post('load')
  loadDocuments(@Body() body: { documents: { id: string; content: string; source?: string }[] }) {
    return this.ragDbService.loadDocuments(body.documents)
  }

  查看存了多少文档
  @Get('status')
  getStatus() {
    return this.ragDbService.getStatus()
  }

  // 纯向量查询，不需要大模型，直接看检索的结果
  @Post('search')
  search(@Body() body: { query: string; topK?: number }) {
    return this.ragDbService.search(body.query, body.topK)
  }

  // 整整的RAG问答接口，输入query，返回答案
  @Post('query')
  query(@Body() body: { query: string; topK?: number }) {
    return this.ragDbService.query(body.query, body.topK)
  }

  // 清空向量库
  @Delete('clear')
  clearKnowledge() {
    return this.ragDbService.clearKnowledge()
  }
}
