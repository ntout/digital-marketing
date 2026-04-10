import { PrismaClient } from '@prisma/client'

export const dbWrite = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

export const dbRead = new PrismaClient({
  datasourceUrl: process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL,
})
