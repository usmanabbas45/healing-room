import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure DATABASE_URL with connection pooling if not already set
const databaseUrl = process.env.DATABASE_URL;

// Add connection pool settings to URL if not present
function getDatabaseUrlWithPooling(url: string | undefined): string {
  if (!url) return "";
  
  // If URL already has connection_limit, return as-is
  if (url.includes("connection_limit") || url.includes("pgbouncer=true")) {
    return url;
  }
  
  // Add connection pooling parameters
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=10&pool_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: getDatabaseUrlWithPooling(databaseUrl),
      },
    },
  });

// Always store in global to prevent multiple instances (critical for serverless)
globalForPrisma.prisma = prisma;

// Graceful shutdown handler
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;

