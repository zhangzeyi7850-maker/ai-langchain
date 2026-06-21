import { Controller, Post, Body } from '@nestjs/common';
import { FunctionCallingService } from './function-calling.service';

@Controller('function-calling')
export class FunctionCallingController {
  constructor(private readonly functionCallingService: FunctionCallingService) {}

  @Post('run')
  run(@Body() body: { message: string }) {
    return this.functionCallingService.runFunctionCalling(body.message);
  }
}
