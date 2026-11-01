import { Prisma, PrismaClient } from '@/generated/prisma';
import { logger } from '@/lib/common/logger/logger';
import { withAccelerate } from '@prisma/extension-accelerate';

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
basePrisma.$on('query', (e: Prisma.QueryEvent) => {
  logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
basePrisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error(`[Prisma Error] ${e.message}`);
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
basePrisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn(`[Prisma Warning] ${e.message}`);
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
basePrisma.$on('info', (e: Prisma.LogEvent) => {
  logger.info(`[Prisma Info] ${e.message}`);
});

// $extends dengan middleware misalnya
const prisma = basePrisma.$extends(withAccelerate());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export default prisma;
