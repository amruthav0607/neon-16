require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const users = await p.user.findMany({
        select: { id: true, name: true, email: true, role: true, isApproved: true }
    });
    console.log("Users in DB:");
    console.log(JSON.stringify(users, null, 2));
    await p.$disconnect();
}

main().catch(e => {
    console.error("Error:", e.message);
    p.$disconnect();
});
