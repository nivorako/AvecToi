import { headers } from "next/headers";

// Minimal server-side REST helper for calling Payload endpoints from Server Components.
// It forwards cookies and (optionally) a JWT token stored in the `avectoi-token` cookie.

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
    if (!serverURL) return "http://localhost:3000";
    return serverURL;
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
        },
        // These endpoints are user-specific; avoid caching across requests/users.
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Payload REST error ${res.status} on ${path}`);
    }

    return (await res.json()) as T;
}

export async function getCurrentUser() {
    // Used as a guard for protected pages (redirect to /login when null).
    const me = await payloadREST<PayloadMeResponse>("/api/users/me");
    return me.user ?? null;
}

export async function findCareGroups() {
    // Home page helper: list the caregroups the current user is allowed to see.
    return payloadREST<PayloadFindResponse<{ id: string; name?: string }>>(
        "/api/caregroups?limit=100&depth=0",
    );
}
