import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '您好 大伟';
  }
  getDw(): string {
    return '您好 大伟';
  }
}
