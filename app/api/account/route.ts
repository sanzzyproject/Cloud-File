import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/cloud-storage";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const backupId = body.backupId;
    if (!backupId) return NextResponse.json({ error: "Missing backupId" }, { status: 400 });

    await deleteAccount(backupId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
