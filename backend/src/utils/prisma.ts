import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  if (url.includes('neon.tech')) {
    // In Node.js (non-edge) environments, Neon's serverless driver needs a WebSocket polyfill.
    // In Vercel Lambda it uses the built-in WebSocket; the dynamic require is a no-op there.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      neonConfig.webSocketConstructor = require('ws');
    } catch {
      // ws not available — running in an edge/browser-like environment that has native WebSocket
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter } as any);
  }

  // Standard TCP client for local PostgreSQL
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
