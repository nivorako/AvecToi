import { cookies } from "next/headers";
import type { Where } from "payload";

import { getPayloadInstance } from "@/lib/payloadConfig";

// Minimal server-side helper for calling Payload from Server Components.
//
// Uses Payload's local API (getPayload) instead of HTTP calls back to our own
// server:
// - No request origin is needed, so Host / X-Forwarded-* headers are never
//   trusted (they are client-controlled → host header injection / SSRF).
// - No network hop → no timeouts and no Vercel deployment-protection bypass.
// - Auth: the `avectoi-token` JWT (plus raw cookies) is passed to `payload.auth`,
//   then every operation runs as that user with `overrideAccess: false`, so
//   Payload's access control applies exactly like it did through REST.

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

async function getCookieHeaderFromNextCookies(): Promise<string> {
    try {
        const cookieStore = await cookies();
        const all = cookieStore.getAll();
        return all
            .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
            .join("; ");
    } catch {
        return "";
    }
}

function buildAuthHeaders(cookieHeader: string): Headers {
    // `payload.auth` authenticates via the `Authorization: JWT <token>` header
    // or Payload's own `payload-token` cookie; we forward both.
    const h = new Headers();
    if (cookieHeader) h.set("cookie", cookieHeader);
    const token = getTokenFromCookieHeader(cookieHeader);
    if (token) h.set("Authorization", `JWT ${token}`);
    return h;
}

function numberParam(
    query: URLSearchParams,
    key: string,
): number | undefined {
    const raw = query.get(key);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
}

export function parseWhereParams(query: URLSearchParams): Where | undefined {
    // Accepts Payload REST-style filters like `where[careGroup][equals]=abc`.
    // Comma-separated values become arrays (for `in` / `not_in`).
    let where: Record<string, Record<string, unknown>> | null = null;

    for (const [key, rawValue] of query.entries()) {
        const match = key.match(/^where\[([^\]]+)\]\[([^\]]+)\]$/);
        if (!match) continue;
        const [, field, operator] = match;
        const value =
            operator === "in" || operator === "not_in"
                ? rawValue.split(",").filter(Boolean)
                : rawValue;
        where ??= {};
        where[field] = { ...(where[field] ?? {}), [operator]: value };
    }

    return (where ?? undefined) as Where | undefined;
}

function parseJsonBody(init?: RequestInit): Record<string, unknown> {
    if (typeof init?.body !== "string" || init.body.length === 0) return {};
    return JSON.parse(init.body) as Record<string, unknown>;
}

export async function payloadREST<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const payload = await getPayloadInstance();
    const cookieHeader = await getCookieHeaderFromNextCookies();
    const { user } = await payload.auth({
        headers: buildAuthHeaders(cookieHeader),
        canSetHeaders: false,
    });
    const access = { user: user ?? undefined, overrideAccess: false };

    const qIndex = path.indexOf("?");
    const pathname = qIndex === -1 ? path : path.slice(0, qIndex);
    const query = new URLSearchParams(qIndex === -1 ? "" : path.slice(qIndex + 1));
    const [, , collection, rawId] = pathname.split("/");
    const id = rawId ? decodeURIComponent(rawId) : undefined;
    const method = (init?.method ?? "GET").toUpperCase();

    if (!collection) {
        throw new Error(`Unsupported Payload path: ${path}`);
    }

    // Payload "me" endpoint: resolve the current user.
    if (method === "GET" && collection === "users" && rawId === "me") {
        return { user } as T;
    }

    if (method === "GET") {
        if (id !== undefined) {
            return (await payload.findByID({
                collection,
                id,
                depth: numberParam(query, "depth") ?? 0,
                ...access,
            })) as T;
        }

        return (await payload.find({
            collection,
            where: parseWhereParams(query),
            limit: numberParam(query, "limit") ?? 10,
            page: numberParam(query, "page"),
            sort: query.get("sort") ?? undefined,
            depth: numberParam(query, "depth") ?? 0,
            ...access,
        })) as T;
    }

    if (!id) {
        if (method !== "POST") {
            throw new Error(`Unsupported Payload REST method ${method} on ${path}`);
        }
        const doc = await payload.create({
            collection,
            data: parseJsonBody(init),
            ...access,
        });
        return { doc } as T;
    }

    if (method === "PATCH") {
        const doc = await payload.update({
            collection,
            id,
            data: parseJsonBody(init),
            ...access,
        });
        return { doc } as T;
    }

    if (method === "DELETE") {
        const doc = await payload.delete({
            collection,
            id,
            ...access,
        });
        return { doc } as T;
    }

    throw new Error(`Unsupported Payload REST method ${method} on ${path}`);
}

export async function getCurrentUser() {
    // Used as a guard for protected pages (redirect to /login when null).
    const payload = await getPayloadInstance();
    const cookieHeader = await getCookieHeaderFromNextCookies();

    const { user } = await payload.auth({
        headers: buildAuthHeaders(cookieHeader),
        canSetHeaders: false,
    });
    return (user ?? null) as PayloadMeResponse["user"];
}

export async function findCareGroups() {
    // Home page helper: list the caregroups the current user is allowed to see.
    return payloadREST<PayloadFindResponse<{ id: string; name?: string }>>(
        "/api/caregroups?limit=100&depth=0",
    );
}
