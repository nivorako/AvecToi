import { headers } from "next/headers";

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
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!serverURL) return "http://localhost:3000";
    return serverURL;
}

export async function payloadREST<T>(
    path: string,
    init?: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<T> {
    const cookieHeader = (await headers()).get("cookie") ?? "";
    const token = getTokenFromCookieHeader(cookieHeader);

    const res = await fetch(`${getServerURL()}${path}`, {
        ...init,
        headers: {
            ...(init?.headers ?? {}),
            cookie: cookieHeader,
            ...(token ? { Authorization: `JWT ${token}` } : {}),
        },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Payload REST error ${res.status} on ${path}`);
    }

    return (await res.json()) as T;
}

export async function getCurrentUser() {
    const me = await payloadREST<PayloadMeResponse>("/api/users/me");
    return me.user ?? null;
}

export async function findCareGroups() {
    return payloadREST<PayloadFindResponse<{ id: string; name?: string }>>(
        "/api/caregroups?limit=100&depth=0",
    );
}
