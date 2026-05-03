import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const { PrismaClient } = pkg

const connectionString = process.env.DATABASE_URL

const adapter = new PrismaNeon({ connectionString })

const globalForPrisma = globalThis

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma
}

export default prisma