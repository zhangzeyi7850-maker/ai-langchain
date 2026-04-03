import { Injectable } from '@nestjs/common';

@Injectable()
export class TestService {
  // 真正干活的代码写在这里
  getList() {
    return [
      { id: 1, name: '大伟' },
      { id: 2, name: '小明' },
    ];
  }
}
