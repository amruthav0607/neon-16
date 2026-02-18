import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DocumentsClient from "./DocumentsClient";

interface PageProps {
    searchParams: {
        workspaceId?: string;
    };
}

export default async function DocumentsPage({ searchParams }: PageProps) {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const userId = session.user.id as string;

    // Fetch all workspaces for the selector
    const workspaces = await prisma.workspace.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            createdAt: true,
        }
    });

    let documents: any[] = [];
    const selectedWorkspaceId = searchParams.workspaceId;

    if (selectedWorkspaceId) {
        const ownsWorkspace = workspaces.some(w => w.id === selectedWorkspaceId);
        if (ownsWorkspace) {
            documents = await prisma.document.findMany({
                where: {
                    workspaceId: selectedWorkspaceId,
                    userId
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    createdAt: true
                }
            });
        }
    }

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">My Documents</h1>
                <p className="text-gray-400">Upload and manage documents within your workspaces.</p>
            </div>
            <DocumentsClient
                workspaces={workspaces}
                documents={documents}
                selectedWorkspaceId={selectedWorkspaceId}
            />
        </div>
    );
}
