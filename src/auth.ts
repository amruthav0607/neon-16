import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function getUser(email: string) {
    try {
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return user[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        if (!user.isApproved) {
                            // Return null or throw specific error if possible.
                            // NextAuth default behavior for errors is to return null or throw.
                            // We'll return null for now (generic invalid creds) but ideally we'd pass a specific error.
                            // For simplicity, we just won't auth them.
                            console.log("User not approved");
                            return null;
                        }
                        return {
                            id: user.id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }
                }
                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
});
