import { NextResponse } from "next/server";

import { getPayload } from "payload";

import config from "@/payload.config";

const COOKIE_NAME = "avectoi-token";

function getSetCookieHeaders(res: Response): string[] {
    const anyHeaders = res.headers as unknown as {
        getSetCookie?: () => string[];
    };
    if (typeof anyHeaders.getSetCookie === "function") {
        return anyHeaders.getSetCookie();
    }

    const header = res.headers.get("set-cookie");
    return header ? [header] : [];
}

export async function POST(req: Request) {
    const { email, password, name } = (await req.json()) as {
        email?: string;
        password?: string;
        name?: string;
    };

    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const payload = await getPayload({ config });

    const existing = await payload.find({
        collection: "users",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            email: {
                equals: normalizedEmail,
            },
        },
        overrideAccess: true,
    });

    if (existing.docs.length > 0) {
        return NextResponse.json(
            { ok: false, message: "Email déjà utilisé" },
            { status: 409 },
        );
    }

    await payload.create({
        collection: "users",
        data: {
            email: normalizedEmail,
            password,
            name: name || normalizedEmail,
        },
        overrideAccess: true,
    });

    const baseURL =
        process.env.NEXT_PUBLIC_SERVER_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
        "http://localhost:3000";

    const res = await fetch(`${baseURL}/api/users/login`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password }),
        cache: "no-store",
    });

    if (!res.ok) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const json = (await res.json()) as { token?: string };
    if (!json.token) {
        return NextResponse.json({ ok: false }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });

    for (const setCookie of getSetCookieHeaders(res)) {
        response.headers.append("set-cookie", setCookie);
    }

    response.cookies.set({
        name: COOKIE_NAME,
        value: json.token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });

    return response;
}
