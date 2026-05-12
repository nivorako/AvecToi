import { cookies } from "next/headers";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getPayload } from "payload";

import config from "@/payload.config";

export const runtime = "nodejs";

function getServerURL(): string {
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
    if (serverURL) return serverURL;

    const vercelURL = process.env.VERCEL_URL;
    if (vercelURL) return `https://${vercelURL}`;

    return "http://localhost:3000";
}

type PayloadMeResponse = {
    user?: { id: string } | null;
};

async function getUserIDFromToken(token: string): Promise<string | null> {
    const meRes = await fetch(`${getServerURL()}/api/users/me`, {
        headers: {
            Authorization: `JWT ${token}`,
        },
        cache: "no-store",
    });

    if (!meRes.ok) return null;

    const me = (await meRes.json()) as PayloadMeResponse;
    return me.user?.id ?? null;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    // We proxy downloads through Next.js so we can attach Authorization from the HttpOnly
    // `avectoi-token` cookie. Directly linking to Payload's `doc.url` would 403 for app users
    // who don't have Payload admin cookies.
    const token = (await cookies()).get("avectoi-token")?.value;

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    console.info("case-attachments.file", { id });

    const userID = await getUserIDFromToken(token);
    if (!userID) {
        return new Response("Unauthorized", { status: 401 });
    }

    const payload = await getPayload({ config });

    let doc: {
        url?: string;
        filename?: string;
        mimeType?: string;
        careGroup?: unknown;
        caseType?: unknown;
    } | null = null;

    try {
        doc = (await payload.findByID({
            collection: "case-attachments",
            id,
            depth: 0,
            overrideAccess: true,
            disableTransaction: true,
        } as unknown as Parameters<
            Awaited<ReturnType<typeof getPayload>>["findByID"]
        >[0])) as typeof doc;
    } catch (err) {
        console.warn("case-attachments.file.doc_missing", {
            id,
            message: err instanceof Error ? err.message : String(err),
        });
        return new Response("Not found", { status: 404 });
    }

    if (!doc) {
        return new Response("Not found", { status: 404 });
    }

    const careGroupID =
        typeof doc?.careGroup === "string" || typeof doc?.careGroup === "number"
            ? doc.careGroup
            : (doc?.careGroup as { id?: string | number } | undefined)?.id;

    if (!careGroupID) {
        return new Response("Not found", { status: 404 });
    }

    const membership = await payload.find({
        collection: "memberships",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            and: [
                { user: { equals: userID } },
                { careGroup: { equals: careGroupID } },
            ],
        },
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["find"]
    >[0]);

    const role = (membership.docs[0] as { role?: string } | undefined)?.role;
    const caseType = doc?.caseType;

    const canRead =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && caseType === "medical");

    if (!canRead) {
        return new Response("Forbidden", { status: 403 });
    }

    if (!doc.url) {
        console.warn("case-attachments.file.no_url", { id, doc });
        return new Response("File not available", { status: 404 });
    }

    // `doc.url` can be absolute or relative depending on configuration.
    const fileURL = new URL(doc.url, getServerURL()).toString();

    const fileRes = await fetch(fileURL, {
        headers: {
            Authorization: `JWT ${token}`,
        },
        cache: "no-store",
    });

    if (fileRes.ok && fileRes.body) {
        const headers: Record<string, string> = {};
        const contentType = fileRes.headers.get("content-type");
        if (contentType) headers["content-type"] = contentType;

        const contentDisposition = fileRes.headers.get("content-disposition");
        if (contentDisposition) {
            headers["content-disposition"] = contentDisposition;
        } else if (doc.filename) {
            headers["content-disposition"] =
                `inline; filename="${doc.filename}"`;
        }

        return new Response(fileRes.body, {
            status: fileRes.status,
            headers,
        });
    }

    console.warn("case-attachments.file.upstream_failed", {
        id,
        fileURL,
        status: fileRes.status,
        contentType: fileRes.headers.get("content-type"),
    });

    // Fallback: when Payload's upload static route (doc.url) isn't being served by the current
    // runtime (e.g. Next.js not exposing the `staticDir`), stream the file directly from disk.
    if (!doc.filename) {
        const text = await fileRes.text().catch(() => "");
        return new Response(text || "Not found", { status: fileRes.status });
    }

    const absolutePath = path.join(
        process.cwd(),
        "case-attachments",
        doc.filename,
    );
    try {
        const s = await stat(absolutePath);
        if (!s.isFile()) {
            console.warn("case-attachments.file.not_a_file", {
                id,
                absolutePath,
            });
            return new Response("Not found", { status: 404 });
        }
    } catch {
        console.warn("case-attachments.file.fs_missing", { id, absolutePath });
        return new Response("Not found", { status: 404 });
    }

    const stream = Readable.toWeb(createReadStream(absolutePath));
    return new Response(stream as unknown as ReadableStream, {
        status: 200,
        headers: {
            "content-type": doc.mimeType || "application/octet-stream",
            "content-disposition": `inline; filename="${doc.filename}"`,
        },
    });
}
