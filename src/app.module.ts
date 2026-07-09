import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TestController } from './test/testController'
import { TestService } from './test/testService'
import { DemoModule } from './demo/demo.module'
import { ConfigModule } from '@nestjs/config'
// import { UserController } from './user/user.controller';
// import { UserService } from './user/user.service';
import { UserModule } from './user/user.module'
import { OrderModule } from './order/order.module'
import { PrismaModule } from './prisma/prisma.module'
import { PostModule } from './post/post.module'
import { ModelsModule } from './models/models.module'
import { PromptsModule } from './prompts/prompts.module'
import { ChainsModule } from './chains/chains.module'
import { AgentsModule } from './agents/agents.module'
import { MemoryModule } from './memory/memory.module'
import { RagModule } from './rag/rag.module'
import { FunctionCallingModule } from './function-calling/function-calling.module'
import { RagDbModule } from './rag-db/rag-db.module'
import { McpClientModule } from './mcp-client/mcp-client.module'
import { McpAgentModule } from './mcp-agent/mcp-agent.module'
import { EmbedModule } from './embed/embed.module'
// import { RagDbChromaModule } from './rag-db-2methods/rag-db-2methods.module'; // 这是一个示例模块，展示了如何使用 ChromaDB 进行向量存储和检索。你可以根据需要选择使用它或其他向量数据库模块。
import { LanggraphModule } from './langgraph/langgraph.module'

@Module({
  imports: [
    DemoModule,
    UserModule,
    OrderModule,
    PrismaModule,
    PostModule,
    ConfigModule.forRoot({
      isGlobal: true // 这个配置确保了 ConfigModule 在整个应用中都是全局可用的，无需在其他模块中再次导入。
    }),
    ModelsModule,
    PromptsModule,
    ChainsModule,
    AgentsModule,
    MemoryModule,
    RagModule,
    FunctionCallingModule,
    RagDbModule,
    McpClientModule,
    McpAgentModule,
    EmbedModule,
    // RagDbChromaModule,
    LanggraphModule
  ],
  controllers: [AppController, TestController],
  providers: [AppService, TestService],
  exports: [] // 这里添加的模块就能在其他模块直接使用了
})
export class AppModule {}
