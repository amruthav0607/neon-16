import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    console.log(`>>> DELETE /api/documents/${params.id} REQUEST RECEIVED`);
    const session = await auth();

    if (!session || !session.user) {
        console.error("Unauthorized delete attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const id = params.id;
        console.log(`Attempting to delete doc ID: ${id} for user: ${session.user.id}`);

        // Verify ownership
        const doc = await prisma.document.findUnique({
            where: { id, userId: session.user.id as string }
        });

        if (!doc) {
            console.error(`Document ${id} NOT FOUND in DB for this user`);
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        await prisma.document.delete({
            where: { id }
        });

        console.log(`SUCCESS: Document ${id} deleted`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE ERROR:", error.message);
        return NextResponse.json({ error: "Failed to delete document", details: error.message }, { status: 500 });
    }
}
