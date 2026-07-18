import { NextResponse } from "next/server";
import { chatAI } from "@/lib/cloud-storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const answer = await chatAI(message);
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
