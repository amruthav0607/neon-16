import NextAuth from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            role?: string
        } & DefaultSession["user"]
    }
    interface User {
        role?: string
    }
}

import { JWT } from "next-auth/jwt"

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role?: string
    }
}
