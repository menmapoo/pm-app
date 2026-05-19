import { PrismaClient } from '@prisma/client';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  if (url.includes('neon.tech')) {
    // HTTP-based adapter: pure HTTP requests, no WebSocket, no native binary.
    // Works in any Lambda/Edge/serverless runtime.
    const sql = neon(url);
    const adapter = new PrismaNeonHTTP(sql);
    return new PrismaClient({ adapter } as any);
  }

  // Standard client for local PostgreSQL
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
