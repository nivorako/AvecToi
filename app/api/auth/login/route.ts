import { NextResponse } from "next/server";

// App-level JWT cookie used by Next.js Server Components to authenticate against Payload.
// This is separate from Payload's own admin cookies; we forward both so /admin and /app stay in sync.
const COOKIE_NAME = "avectoi-token";

function withVercelProtectionBypass(url: string): string {
    const bypass = process.env.VERCEL_PROTECTION_BYPASS;
    if (!bypass) return url;

    const u = new URL(url);
    u.searchParams.set("x-vercel-protection-bypass", bypass);
    u.searchParams.set("x-vercel-set-bypass-cookie", "true");
    return u.toString();
}

function getVercelBypassHeaders(): Record<string, string> {
    const bypass = process.env.VERCEL_PROTECTION_BYPASS;
    if (!bypass) return {};
    return {
        "x-vercel-protection-bypass": bypass,
        "x-vercel-set-bypass-cookie": "true",
    };
}

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
    // Custom login endpoint used by the /login page.
    //
    // Flow:
    // - Call Payload's REST login endpoint (/api/users/login)
    // - Forward any Set-Cookie headers returned by Payload (admin session cookies)
    // - Set our own HttpOnly cookie containing the JWT token for app auth
    const { email, password } = (await req.json()) as {
        email?: string;
        password?: string;
    };

    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const baseURL = new URL(req.url).origin;
    const loginURL = withVercelProtectionBypass(`${baseURL}/api/users/login`);

    const res = await fetch(loginURL, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...getVercelBypassHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password }),
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
            "Payload login failed",
            JSON.stringify({ status: res.status, body: text }),
        );
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
