import { NextResponse } from "next/server";
import { getStorageInfo } from "@/lib/cloud-storage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get("backupId");
    if (!backupId) return NextResponse.json({ error: "Missing backupId" }, { status: 400 });

    const info = await getStorageInfo(backupId);
    return NextResponse.json(info);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
