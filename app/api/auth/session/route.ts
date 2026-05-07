import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/payloadRest";

export async function GET() {
    // Lightweight session endpoint for the app.
    // Returns the currently authenticated user (or null) based on forwarded cookies/JWT.
    const user = await getCurrentUser();
    return NextResponse.json({ user });
}
