import { NextResponse } from "next/server";
import { listFiles, deleteFile } from "@/lib/cloud-storage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get("backupId");
    if (!backupId) return NextResponse.json({ error: "Missing backupId" }, { status: 400 });

    const files = await listFiles(backupId);
    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const backupId = body.backupId;
    const key = body.key;
    if (!backupId || !key) return NextResponse.json({ error: "Missing backupId or key" }, { status: 400 });

    await deleteFile(backupId, key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
