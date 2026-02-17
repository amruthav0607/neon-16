import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, isApproved } = await request.json();

        if (typeof userId !== 'string' || typeof isApproved !== 'boolean') {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isApproved }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update user approval:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
