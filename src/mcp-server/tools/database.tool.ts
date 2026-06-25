// src/mcp-server/tools/database.tool.ts
// 复用 Prisma Client 查询已有的 users 表

import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

// MCP Server 是独立进程，需要自己初始化 Prisma Client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function handleDatabaseQuery(args: any): Promise<string> {
  const { name, role, limit = 5 } = args

  // 构建查询条件
  const where: any = {}
  if (name) {
    where.name = { containers: name, mode: 'insensitive' } // 模糊搜索，忽略大小写
  }
  if (role) {
    where.role = role
  }

  const users = await prisma.user.findMany({
    where, // 查询条件
    take: Math.min(Number(limit), 20), // 限制最大返回条数为 20
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }, // select 只返回需要的字段
    orderBy: {
      createdAt: 'desc' // 按创建时间降序排序
    }
  })

  if (!users.length) {
    return '未查询到符合条件的用户。'
  }

  // 格式化为易读的文本（LLM 会基于这个文本回答用户）
  const userList = users
    .map(
      (user, i) =>
        `${i + 1}. ${user.name} (ID: ${user.id}, email: ${user.email}, role: ${user.role})`
    )
    .join('\n')

  return `找到 ${users.length} 个用户:\n${userList}`
}
