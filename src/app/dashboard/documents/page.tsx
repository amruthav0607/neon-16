import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const documents = await prisma.document.findMany({
        where: {
            userId: session.user.id as string,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="min-h-screen bg-[#030303] text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">Knowledge Base</h1>
                        <p className="text-gray-400">Upload documents and get instant answers powered by AI.</p>
                    </div>
                </div>

                <DocumentsClient initialDocuments={documents} />
            </div>
        </div>
    );
}
