const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const docs = await prisma.document.findMany({
            select: { id: true, name: true, userId: true }
        });
        console.log('DOCUMENTS_LIST:');
        console.log(JSON.stringify(docs, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
