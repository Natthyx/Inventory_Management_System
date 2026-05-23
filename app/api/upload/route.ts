import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sanitizePublicId(originalName: string): string {
  const base =
    originalName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "item";
  return `${base}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof Blob)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(fileEntry.type)) {
      return NextResponse.json({ error: "Invalid image type." }, { status: 400 });
    }

    const rawNameEntry = formData.get("filename");
    const originalFilename =
      typeof rawNameEntry === "string" && rawNameEntry.length > 0 ? rawNameEntry : "upload";

    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds 5MB limit." }, { status: 400 });
    }

    const publicId = sanitizePublicId(originalFilename);
    const url = await uploadImage(buffer, publicId);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[upload]", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
