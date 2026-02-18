import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, isApproved } = await request.json();

        if (typeof userId !== 'number' || typeof isApproved !== 'boolean') {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        await db.update(users)
            .set({ isApproved })
            .where(eq(users.id, userId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update user approval:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
