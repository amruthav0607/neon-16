import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { indexDocument } from "@/lib/vector-store";

export async function GET() {
  return NextResponse.json({ message: "Upload endpoint is active. Use POST to upload documents." });
}

export async function POST(req: NextRequest) {
  console.log(">>> POST /api/document-upload REQUEST RECEIVED");

  try {
    const session = await auth();
    console.log("Session Check:", session ? `User: ${session.user.email}` : "NO SESSION");

    if (!session || !session.user) {
      console.error("Unauthorized: No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string;

    if (!file) {
      console.error("No file found in form data");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!workspaceId) {
      console.error("No workspaceId provided");
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    console.log(`Processing File: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    let content = "";
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("File buffer loaded, size:", buffer.length);

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isText = file.type.startsWith("text/") ||
      [".txt", ".md", ".js", ".py", ".json", ".csv"].some(ext => file.name.endsWith(ext));

    if (isPdf) {
      console.log("Starting PDF parsing with pdf2json...");
      const PDFParser = require("pdf2json");
      const parser = new PDFParser(null, 1); // 1 for raw text

      content = await new Promise((resolve, reject) => {
        parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        parser.on("pdfParser_dataReady", () => {
          const text = parser.getRawTextContent();
          resolve(text);
        });
        parser.parseBuffer(buffer);
      });
      console.log("PDF parsed. Extracted characters:", content?.length || 0);
    } else if (isText) {
      console.log("Starting Text parsing...");
      content = buffer.toString("utf-8");
      console.log("Text parsed. Extracted characters:", content?.length || 0);
    } else {
      console.warn("Unsupported file type:", file.type);
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or Text-based file." }, { status: 400 });
    }

    if (!content || !content.trim()) {
      console.error("Content extraction resulted in empty string");
      return NextResponse.json({ error: "Document content could not be extracted or is empty" }, { status: 400 });
    }

    // Verify workspace belongs to user
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId, userId: session.user.id }
    });

    if (!workspace) {
      return NextResponse.json({ error: "Invalid workspace" }, { status: 403 });
    }

    console.log("Preparing database record...");
    const document = await prisma.document.create({
      data: {
        name: file.name,
        content: content,
        userId: session.user.id as string,
        workspaceId: workspaceId
      },
    });

    console.log("SUCCESS: Document saved to DB. Starting Vector Indexing...");

    // Background indexing (or await if we want to confirm)
    await indexDocument(document.id, content);
    console.log("Vector Indexing Complete.");

    return NextResponse.json({ id: document.id, name: document.name });

  } catch (error: any) {
    console.error("!!! CRITICAL UPLOAD ERROR:", error.message);
    console.error(error.stack);
    return NextResponse.json({
      error: "Failed to process document",
      details: error.message,
      type: error.name
    }, { status: 500 });
  }
}
