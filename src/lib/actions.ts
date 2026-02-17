"use server";


import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";

export async function register(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { error: "User already exists" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // First user is automatically approved and becomes admin
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? "ADMIN" : "USER";
        const isApproved = userCount === 0;

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                isApproved,
            },
        });

        return { success: "Account created! Waiting for admin approval." };
    } catch (error: any) {
        console.error("Registration error:", error);
        return { error: error.message || "Something went wrong" };
    }

}

export async function approveUser(userId: string) {
    const session = await auth();
    if (session?.user.role !== "ADMIN") return { error: "Unauthorized" };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isApproved: true },
        });
        return { success: "User approved" };
    } catch (error) {
        return { error: "Failed to approve user" };
    }
}

export async function revokeUser(userId: string) {
    const session = await auth();
    if (session?.user.role !== "ADMIN") return { error: "Unauthorized" };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isApproved: false },
        });
        return { success: "User access revoked" };
    } catch (error) {
        return { error: "Failed to revoke user" };
    }
}

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials." };
                default:
                    if (error.message === "ApprovalPending") {
                        return { error: "Account pending approval." };
                    }
                    return { error: "Something went wrong." };
            }
        }
        throw error;
    }
}
