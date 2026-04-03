
import { Injectable } from '@nestjs/common';
import { User } from './user';
import { MailService } from './mail.server';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user-dto';
@Injectable()
export class UserService {
  constructor(private readonly mailService: MailService, private readonly prismaService: PrismaService) { }
  // 模拟数据库中的用户数据
  private users: User[] = [{
    id: 1,
    name: '用户1',
    age: 20,
    email: ''
  },
  {
    id: 2,
    name: '用户2',
    age: 22,
    email: ''
  }]; // 模拟数据库中的用户数据
  // 具体的业务逻辑 调用第三方的api  数据库 数据转换
  getUser(): string {
    return 'This is the user service';
  }
  async addUser(createUserDto: CreateUserDto) {
    const user = await this.prismaService.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
        role: createUserDto.role || 'user', // 默认角色为 'user'
      },
    });
    return { success: true, message: `用户 ${user.name} 创建成功`, data: user };  

  }
  async findAll() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {createdAt: 'desc'}, // 按照创建时间降序排序
    });
    return {total: users.length, data: users};
  }
  async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            published: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' }, // 按照创建时间降序排序
      }
      },
    });
    if (!user) {
      return { success: false, message: `用户 ${id} 不存在` };
    }
    return { success: true, data: user };
  }
  removeUser(id: string) {
    return this.prismaService.user.delete({
      where: { id: parseInt(id) },
    }).then(() => {
      return { success: true, message: `用户 ${id} 删除成功` };
    }).catch(() => {
      return { success: false, message: `用户 ${id} 不存在` };
    });
  }

  updateUser(id: string, updateUserDto: UpdateUserDto) {
    return this.prismaService.user.update({
      where: { id: parseInt(id) },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password: updateUserDto.password,
        role: updateUserDto.role,
      },
    }).then((user) => {
      return { success: true, message: `用户 ${id} 更新成功`, data: user };
    }).catch(() => {
      return { success: false, message: `用户 ${id} 不存在` };
    });
  }
  async searchUsers(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, role } = query;
    // 计算分页参数
    // skip：跳过前面多少条记录（分页偏移量）
    // 第 1 页：skip = (1-1) × 10 = 0，从第 1 条开始取
    // 第 2 页：skip = (2-1) × 10 = 10，从第 11 条开始取
    // 第 3 页：skip = (3-1) × 10 = 20，从第 21 条开始取
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const take = parseInt(pageSize);

    const where: any = {};
    if (name) {
      where.name = { contains: name, mode: 'insensitive' }; // 模糊搜索，忽略大小写
    }
    if (role) {
      where.role = role;
    }
    const [total, users] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }), // 获取总记录数 
      this.prismaService.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }), // 获取分页数据
    ]);
    // 计算总页数 向上取整
    // total = 23, pageSize = 10 → totalPage = 3
    const totalPage = Math.ceil(total / take);
    return {
      pagination: {
        total, // 总记录数
        totalPage, // 总页数
        currentPage: parseInt(page), // 当前页码
        pageSize: take, // 每页记录数
        hasNextPage: parseInt(page) < totalPage, // 是否有下一页
        hasPreviousPage: parseInt(page) > 1, // 是否有上一页
      },
      data: users, // 当前页数据
    };

  }

  searchUsers1(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, role } = query;
    // 计算分页参数
    // skip：跳过前面多少条记录（分页偏移量）
    // 第 1 页：skip = (1-1) × 10 = 0，从第 1 条开始取
    // 第 2 页：skip = (2-1) × 10 = 10，从第 11 条开始取
    // 第 3 页：skip = (3-1) × 10 = 20，从第 21 条开始取
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const take = parseInt(pageSize);

    return this.prismaService.user.findMany({
      where: {
        name: name ? { contains: name } : undefined,
        role: role || undefined,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }).then(users => {
      return { total: users.length, data: users };
    });
  }


  // createUser(user: CreateUserDto) {
  //   this.mailService.sendMail({
  //     to: user.email || 'default@example.com',
  //     subject: '欢迎注册',
  //     text: `你好 ${user.name}，欢迎注册我们的服务！`
  //   })
  //   // 这里模拟创建用户，实际项目中会调用数据库
  //   return {
  //     success: true,
  //     message: `用户 ${user.name} 创建成功`,
  //     // 把接收到的数据原样返回，方便调试确认
  //     data: {
  //       id: Date.now(),    // 用时间戳模拟自增 ID
  //       name: '张三',
  //       age: 30,
  //       email: ''
  //     }
  //   }
  //   // db --instance.insert(user)
  // }
  getUserById(id: string) {
    // 这里模拟根据 ID 获取用户，实际项目中会查询数据库
    return {
      id,
      name: '李四',
      age: 25,
      email: 'lisi@example.com'
    }
  }
  getList(page: number, size: number) {
    // 这里模拟分页查询，实际项目中会调用数据库
    const total = 100;

    return [
      {
        id: 1,
        name: '用户1',
        age: 20,
        email: ''
      },
      {
        id: 2,
        name: '用户2',
        age: 22,
        email: ''
      },
      {
        id: 3,
        name: '用户3',
        age: 24,
        email: ''
      },
      // ... 模拟更多用户数据
    ]
  }
  updateUser1(id: string, user: User) {
    // 这里模拟更新用户，实际项目中会调用数据库
    const index = this.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) {
      return {
        success: false,
        message: `用户 ${id} 不存在`
      }
    }
    return {
      success: true,
      message: `用户 ${id} 更新成功`,
      data:  this.users[index] = {
      id: parseInt(id),
      name: user.name || this.users[index].name,
      age: user.age || this.users[index].age,
      email: user.email || this.users[index].email
    }
    }
  }
  deleteUser(id: string) {
    // 这里模拟删除用户，实际项目中会调用数据库
    const index = this.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) {
      return {
        success: false,
        message: `用户 ${id} 不存在`
      }
    }
    this.users.splice(index, 1);
    return {
      success: true,
      message: `用户 ${id} 删除成功`
    }
  }
}   