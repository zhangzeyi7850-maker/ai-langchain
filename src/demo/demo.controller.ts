import { Controller, Get, Post, Body} from '@nestjs/common';
import { DemoService } from './demo.service';
import { CreateUserDto } from './create-user.dto';
@Controller('demo')
export class DemoController {
    constructor(private readonly demoService: DemoService) {}

    @Get('/hello')
    hello() {
        return this.demoService.getHello();
    }
    // POST /demo/user
  // @Body() 从请求体中取出 JSON 数据，映射到 CreateUserDto 类型
  @Post('user')
  createUser(@Body() dto: CreateUserDto) {
    // dto.name、dto.age、dto.email 就是请求体里的字段
    return this.demoService.createUser(dto)
  }
}
