import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user-dto';
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post("add")
    createUser(@Body() user: CreateUserDto) {
        return this.userService.addUser(user);
    }
    @Get('list')
    findAll() {
        return this.userService.findAll();
    }
  // GET /user/list                           → 查询第 1 页，每页 10 条
  // GET /user/list?page=2&pageSize=5         → 查询第 2 页，每页 5 条
  // GET /user/list?name=大伟                  → 按名字模糊搜索
  // GET /user/list?role=admin                → 只查管理员
  // GET /user/list?page=1&pageSize=10&name=大伟&role=admin → 组合查询
    @Get('search')
    searchUser(@Query() query: QueryUserDto) {
        return this.userService.searchUsers(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }
    @Delete(':id')
    removeUser(@Param('id') id: string) {
        return this.userService.removeUser(id);
    }

    @Put(':id')
    updateUser(@Param('id') id: string, @Body() user: UpdateUserDto) {
        return this.userService.updateUser(id, user);
    }

    @Get('getUser')
    getUser(): string {
        return this.userService.getUser();
    }
    @Get('getUser1')
    getUser1(): string {
        return this.userService.getUser();
    }


    @Get('user/:id')
    getUserById(@Param('id') id: string) {
        return this.userService.getUserById(id);
    }
    @Get('list')
    getList(@Query('page') page: number, @Query('size') size: number) {
        // 这里模拟分页查询，实际项目中会调用数据库
        return  this.userService.getList(page, size);
    }

    // user/user/123 --- 路径参数 请求体参数
    @Put('user/:id')
    updateUser1(@Param('id') id: string, @Body() user: User) {
        return  this.userService.updateUser(id, user);
    }

    @Delete('user/:id')
    deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(id);
    }


}