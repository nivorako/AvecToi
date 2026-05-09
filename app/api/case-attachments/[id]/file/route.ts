import { cookies } from "next/headers";

function getServerURL(): string {
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
    if (serverURL) return serverURL;

    const vercelURL = process.env.VERCEL_URL;
    if (vercelURL) return `https://${vercelURL}`;

    return "http://localhost:3000";
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

    const docRes = await fetch(
        `${getServerURL()}/api/case-attachments/${encodeURIComponent(id)}?depth=0`,
        {
            headers: {
                Authorization: `JWT ${token}`,
            },
            cache: "no-store",
        },
    );

    if (!docRes.ok) {
        const text = await docRes.text().catch(() => "");
        return new Response(text || "Not found", { status: docRes.status });
    }

    const doc = (await docRes.json()) as { url?: string; filename?: string };
    if (!doc.url) {
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

    if (!fileRes.ok || !fileRes.body) {
        const text = await fileRes.text().catch(() => "");
        return new Response(text || "Not found", { status: fileRes.status });
    }

    const headers: Record<string, string> = {};
    const contentType = fileRes.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    const contentDisposition = fileRes.headers.get("content-disposition");
    if (contentDisposition) {
        headers["content-disposition"] = contentDisposition;
    } else if (doc.filename) {
        headers["content-disposition"] = `inline; filename="${doc.filename}"`;
    }

    return new Response(fileRes.body, {
        status: fileRes.status,
        headers,
    });
}
