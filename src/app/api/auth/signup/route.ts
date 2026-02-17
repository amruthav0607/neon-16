import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const { name, email, password } = json;

        if (!name || !email || !password || password.length < 6) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the FIRST user. If so, make them admin and approved.
        const userCount = await prisma.user.count();
        const isFirstUser = userCount === 0;

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: isFirstUser ? 'ADMIN' : 'USER',
                isApproved: isFirstUser, // Auto-approve first user/admin
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
