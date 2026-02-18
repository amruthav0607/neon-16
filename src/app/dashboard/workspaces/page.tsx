
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkspaceClient from "./WorkspaceClient";

interface PageProps {
    searchParams: {
        workspaceId?: string;
    };
}

export default async function WorkspacesPage({ searchParams }: PageProps) {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const userId = session.user.id as string;

    // Fetch Workspaces
    const workspaces = await prisma.workspace.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { documents: true }
            }
        }
    });

    let documents: any[] = [];
    const selectedWorkspaceId = searchParams.workspaceId;

    if (selectedWorkspaceId) {
        // Verify ownership and fetch docs
        const workspace = workspaces.find(w => w.id === selectedWorkspaceId);

        if (workspace) {
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
                <h1 className="text-2xl font-bold text-white">AI Workspaces</h1>
                <p className="text-gray-400">Manage your research projects and chat with multiple documents.</p>
            </div>

            <WorkspaceClient
                workspaces={workspaces}
                documents={documents}
                selectedWorkspaceId={selectedWorkspaceId}
            />
        </div>
    );
}
