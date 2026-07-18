import { NextResponse } from "next/server";
import { getOrCreateBackup } from "@/lib/cloud-storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backupId = body.backupId;
    const data = await getOrCreateBackup(backupId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
