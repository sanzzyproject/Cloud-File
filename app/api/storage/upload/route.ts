import { NextResponse } from "next/server";
import { uploadBytes } from "@/lib/cloud-storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const backupId = formData.get("backupId") as string;
    const file = formData.get("file") as File;

    if (!backupId || !file) {
      return NextResponse.json({ error: "Missing backupId or file" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const remoteKey = file.name;
    const contentType = file.type || "application/octet-stream";

    const s3Key = await uploadBytes(backupId, buffer, remoteKey, contentType);
    return NextResponse.json({ success: true, key: s3Key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
