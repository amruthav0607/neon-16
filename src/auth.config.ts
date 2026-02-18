import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/auth/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isAdminPage = nextUrl.pathname.startsWith("/dashboard/admin");

            if (isDashboard) {
                if (!isLoggedIn) return false;

                // Admin protection
                if (isAdminPage && auth.user.role !== "ADMIN") {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }

                return true;
            } else if (isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
