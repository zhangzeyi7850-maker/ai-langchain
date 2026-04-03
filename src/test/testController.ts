import { Controller, Get, Post, Delete } from '@nestjs/common';
import { TestService } from './testService';
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('/list')
  getList() {
    console.log('getList');
    return this.testService.getList();
  }

  @Post('create')
  create() {}

  @Delete(':id')
  delete() {}
}
