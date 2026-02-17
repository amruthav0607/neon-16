const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        const docCount = await prisma.document.count();
        const ytCount = await prisma.youTubeNote.count();
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true }
        });
        const docs = await prisma.document.findMany({
            select: { id: true, name: true, userId: true }
        });

        console.log('--- DATABASE AUDIT ---');
        console.log('Users:', userCount);
        console.log('Docs:', docCount);
        console.log('YT Notes:', ytCount);
        console.log('\nUsers List:', JSON.stringify(users, null, 2));
        console.log('\nDocs List:', JSON.stringify(docs, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
