
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/workspaces - List user's workspaces
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const workspaces = await prisma.workspace.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                _count: {
                    select: { documents: true }
                }
            }
        });

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
    }
}

// POST /api/workspaces - Create a new workspace
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name } = await req.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
        }

        const workspace = await prisma.workspace.create({
            data: {
                name: name.trim(),
                userId: session.user.id as string,
            }
        });

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Failed to create workspace:", error);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
    }
}
