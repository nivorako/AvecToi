import { NextResponse } from "next/server";

const COOKIE_NAME = "avectoi-token";

const PAYLOAD_COOKIE_NAMES = [
    "payload-token",
    "payload-token.sig",
    "payload-refresh-token",
    "payload-refresh-token.sig",
];

export async function POST() {
    const baseURL =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

    try {
        await fetch(`${baseURL}/api/users/logout`, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
        });
    } catch {
        // Ignore logout errors; we always clear our app cookie.
    }

    const response = NextResponse.json({ ok: true });

    for (const name of PAYLOAD_COOKIE_NAMES) {
        response.cookies.set({
            name,
            value: "",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 0,
        });
    }

    response.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    return response;
}
