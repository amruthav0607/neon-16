import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';
import { NextResponse } from 'next/server';

const signupSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const { name, email, password } = signupSchema.parse(json);

        const existingUser = await db.select().from(users).where(eq(users.email, email));

        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the FIRST user. If so, make them admin and approved.
        const allUsers = await db.select().from(users).limit(1);
        const isFirstUser = allUsers.length === 0;

        await db.insert(users).values({
            name,
            email,
            password: hashedPassword,
            role: isFirstUser ? 'admin' : 'user',
            isApproved: isFirstUser, // Auto-approve first user/admin
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
