const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.findFirst({
        where: {
            role: 'ADMIN',
        },
    })
    if (admin) {
        console.log('Admin found:')
        console.log('Email:', admin.email)
        console.log('Name:', admin.name || 'N/A')
        console.log('Approved:', admin.isApproved)
    } else {
        console.log('No admin found.')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
