
import { OpenAIEmbeddings } from "@langchain/openai";
import { PrismaClient } from "@prisma/client";
import { PrismaVectorStore } from "@langchain/community/vectorstores/prisma";

const prisma = new PrismaClient();

// Use text-embedding-3-small (1536 dim) to match DB schema
// Requires OPENAI_API_KEY environment variable
export const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    dimensions: 1536,
});

export const getVectorStore = () => {
    return PrismaVectorStore.withModel(prisma).create(embeddings, {
        prisma: PrismaClient,
        tableName: "DocumentChunk",
        vectorColumnName: "embedding",
        columns: {
            id: PrismaVectorStore.IdColumn,
            content: PrismaVectorStore.ContentColumn,
        },
    });
};

// Helper to embed and store chunks
export async function indexDocument(documentId: string, content: string) {
    // 1. Chunk content (simple splitting for now, ideally use RecursiveCharacterTextSplitter)
    const { RecursiveCharacterTextSplitter } = await import("langchain/text_splitter");
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([content]);

    // 2. Store in Vector Store
    const vectorStore = getVectorStore();

    // We need to add documentId to metadata/relation
    // PrismaVectorStore addModels might be tricky with relations if not configured.
    // Instead, we can manually create embeddings and use prisma.documentChunk.create
    // Or use the store's addModels if we mapped columns.

    // Let's use manual creation for full control over relations
    console.log(`Indexing ${docs.length} chunks for doc ${documentId}...`);

    for (const doc of docs) {
        const embedding = await embeddings.embedQuery(doc.pageContent);

        // Use raw SQL to insert vector since Prisma Client (as of now) has limited vector write support 
        // without specific Raw extensions or typed support. 
        // But with "vector" extension and latest Prisma, we can use $executeRaw or typed model if mapped.
        // Actually, Prisma 5.x supports vector via typed field if we use Unsupported.
        // We have to use $executeRaw to write the vector type.

        await prisma.$executeRaw`
            INSERT INTO "DocumentChunk" ("id", "content", "embedding", "documentId", "createdAt")
            VALUES (gen_random_uuid(), ${doc.pageContent}, ${embedding}::vector, ${documentId}, NOW());
        `;
    }
    console.log("Indexing complete.");
}

export async function vectorSearch(query: string, workspaceId: string, k = 4) {
    const embedding = await embeddings.embedQuery(query);
    const vector = `[${embedding.join(",")}]`;

    // Perform similarity search filtering by workspace via Document relation
    // We order by embedding <-> query_vector
    const results = await prisma.$queryRaw`
        SELECT chunk.id, chunk.content, chunk."documentId", doc.name as "documentName", 
               (chunk.embedding <=> ${vector}::vector) as score
        FROM "DocumentChunk" chunk
        JOIN "Document" doc ON chunk."documentId" = doc.id
        WHERE doc."workspaceId" = ${workspaceId}
        ORDER BY score ASC
        LIMIT ${k};
    ` as any[];

    return results.map(r => ({
        pageContent: r.content,
        metadata: {
            documentId: r.documentId,
            documentName: r.documentName,
            score: r.score
        }
    }));
}
