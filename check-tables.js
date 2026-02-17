const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('TABLES:', JSON.stringify(tables, null, 2));

        for (const table of tables) {
            const name = table.table_name;
            const count = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${name}"`);
            console.log(`Count for ${name}:`, count);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
