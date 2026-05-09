import { headers } from "next/headers";

// Minimal server-side REST helper for calling Payload endpoints from Server Components.
//
// Key points:
// - Auth for the app uses an HttpOnly cookie (`avectoi-token`) containing a Payload JWT.
// - We also forward the raw `cookie` header so Payload's own session cookies (admin) keep working.
// - Requests are `cache: "no-store"` because responses depend on the current user/session.

type PayloadMeResponse = {
    user?: {
        id: string;
        email?: string;
        name?: string;
    } | null;
};

type PayloadFindResponse<TDoc> = {
    docs: TDoc[];
};

function getTokenFromCookieHeader(cookieHeader: string): string | null {
    // We store the JWT in a client-set cookie. On the server we extract it from the raw
    // `cookie` header and decode it (because it is URI-encoded on write).
    // Cookie format: "a=b; c=d". Token is URI-encoded.
    const match = cookieHeader.match(/(?:^|;\s*)avectoi-token=([^;]+)/);
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

function getServerURL(): string {
    // Payload + Next can run on the same origin. We keep this configurable for deployments.
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
    if (serverURL) return serverURL;

    const vercelURL = process.env.VERCEL_URL;
    if (vercelURL) return `https://${vercelURL}`;

    return "http://localhost:3000";
}

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

export async function payloadREST<T>(
    path: string,
    init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<T> {
    // Read incoming request cookies (server-side) so we can forward session context.
    const cookieHeader = (await headers()).get("cookie") ?? "";
    const token = getTokenFromCookieHeader(cookieHeader);

    const res = await fetch(`${getServerURL()}${path}`, {
        ...init,
        headers: {
            ...(init?.headers ?? {}),
            // Forward cookies for Payload auth/session.
            cookie: cookieHeader,
            // Also forward explicit Authorization header when a token is present.
            ...(token ? { Authorization: `JWT ${token}` } : {}),
            ...getVercelBypassHeaders(),
        },
        // These endpoints are user-specific; avoid caching across requests/users.
        cache: "no-store",
    });

    // If Deployment Protection is enabled on Vercel, server-side fetches to the public URL can be
    // blocked unless a bypass token is provided.
    // We retry with bypass parameters when configured.
    if (!res.ok && process.env.VERCEL_PROTECTION_BYPASS) {
        const retry = await fetch(
            withVercelProtectionBypass(`${getServerURL()}${path}`),
            {
                ...init,
                headers: {
                    ...(init?.headers ?? {}),
                    cookie: cookieHeader,
                    ...(token ? { Authorization: `JWT ${token}` } : {}),
                    ...getVercelBypassHeaders(),
                },
                cache: "no-store",
            },
        );

        if (retry.ok) {
            return (await retry.json()) as T;
        }
    }

    if (!res.ok) {
        throw new Error(`Payload REST error ${res.status} on ${path}`);
    }

    return (await res.json()) as T;
}

export async function getCurrentUser() {
    // Used as a guard for protected pages (redirect to /login when null).
    try {
        const me = await payloadREST<PayloadMeResponse>("/api/users/me");
        return me.user ?? null;
    } catch (err) {
        if (
            err instanceof Error &&
            err.message.includes("Payload REST error 401")
        ) {
            return null;
        }

        throw err;
    }
}

export async function findCareGroups() {
    // Home page helper: list the caregroups the current user is allowed to see.
    return payloadREST<PayloadFindResponse<{ id: string; name?: string }>>(
        "/api/caregroups?limit=100&depth=0",
    );
}
