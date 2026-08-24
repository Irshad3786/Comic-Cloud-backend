const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: 'postgresql://postgres:Bablu%40786@localhost:5433/ccdatabase?schema=public' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  console.log('User:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);