// src/demo/dto/create-user.dto.ts

// DTO 就是一个普通的 TypeScript 类
// 用来描述 POST 请求体里有哪些字段、每个字段是什么类型
export class CreateUserDto {
    // 用户名，字符串类型
    name: string

    // 年龄，数字类型
    age: number

    // 邮箱，可选字段（加了 ? 表示可以不传）
    email?: string
}