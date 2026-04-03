import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto'
@Injectable()
export class DemoService {
    getHello(): string {
    return '您好 大伟';
}
// 接收 DTO 对象，处理创建用户的逻辑
  createUser(dto: CreateUserDto) {
    // 这里模拟创建用户，实际项目中会调用数据库
    return {
      success: true,
      message: `用户 ${dto.name} 创建成功`,
      // 把接收到的数据原样返回，方便调试确认
      data: {
        id: Date.now(),    // 用时间戳模拟自增 ID
        name: dto.name,
        age: dto.age,
        email: dto.email ?? '未填写',
      },
    }
  }
}
