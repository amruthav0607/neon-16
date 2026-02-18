
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking Prisma Client models...");

        // Check if models exist on the client instance
        if (!prisma.workspace) {
            throw new Error("prisma.workspace is undefined! Client generation failed?");
        }
        if (!prisma.documentChunk) {
            throw new Error("prisma.documentChunk is undefined!");
        }

        console.log("Prisma Client has new models.");

        // Attempt to list workspaces (should be empty or succeed)
        // We can't easily create one without a valid user ID, but listing is safe.
        // We can try to count.
        const count = await prisma.workspace.count();
        console.log(`Current workspace count: ${count}`);

        console.log("Backend verification successful.");
    } catch (e) {
        console.error("Verification failed:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
