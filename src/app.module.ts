import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestController } from './test/testController';
import { TestService } from './test/testService';
import { DemoModule } from './demo/demo.module';
import { ConfigModule } from '@nestjs/config';
// import { UserController } from './user/user.controller';
// import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [DemoModule, UserModule, OrderModule, PrismaModule, PostModule,
    ConfigModule.forRoot({
      isGlobal: true, // 👈 关键
    }),],
  controllers: [AppController, TestController],
  providers: [AppService, TestService,],
})
export class AppModule {}
