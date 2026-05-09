import { cookies } from "next/headers";
import { getPayload } from "payload";

import config from "@/payload.config";

function getServerURL(): string {
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!serverURL) return "http://localhost:3000";
    return serverURL;
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

async function canManageAttachment(args: {
    token: string;
    attachmentID: string;
}): Promise<
    | { ok: true; payload: Awaited<ReturnType<typeof getPayload>> }
    | { ok: false; status: number; message: string }
> {
    // These endpoints are called from a Client Component (menu actions). We can't use Server
    // Actions here without passing event handlers across the server/client boundary.
    const userID = await getUserIDFromToken(args.token);
    if (!userID) return { ok: false, status: 401, message: "Unauthorized" };

    const payload = await getPayload({ config });

    const attachment = (await payload.findByID({
        collection: "case-attachments",
        id: args.attachmentID,
        depth: 0,
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["findByID"]
    >[0])) as { careGroup?: unknown };

    const careGroupID =
        typeof attachment?.careGroup === "string" ||
        typeof attachment?.careGroup === "number"
            ? attachment.careGroup
            : (attachment?.careGroup as { id?: string | number } | undefined)
                  ?.id;

    if (!careGroupID) {
        return { ok: false, status: 400, message: "Invalid attachment" };
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

    if (role !== "owner" && role !== "family") {
        return { ok: false, status: 403, message: "Forbidden" };
    }

    // Local API with `disableTransaction: true` helps avoid transaction errors seen on some
    // local Mongo setups during write operations.
    return { ok: true, payload };
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const token = (await cookies()).get("avectoi-token")?.value;
    if (!token) return new Response("Unauthorized", { status: 401 });

    const { id } = await params;

    const auth = await canManageAttachment({ token, attachmentID: id });
    if (!auth.ok) return new Response(auth.message, { status: auth.status });

    const json = (await req.json().catch(() => null)) as {
        displayName?: unknown;
    } | null;

    const displayName =
        typeof json?.displayName === "string" ? json.displayName.trim() : "";

    const updated = await auth.payload.update({
        collection: "case-attachments",
        id,
        data: {
            displayName,
        },
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["update"]
    >[0]);

    return Response.json(updated);
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const token = (await cookies()).get("avectoi-token")?.value;
    if (!token) return new Response("Unauthorized", { status: 401 });

    const { id } = await params;

    const auth = await canManageAttachment({ token, attachmentID: id });
    if (!auth.ok) return new Response(auth.message, { status: auth.status });

    const deleted = await auth.payload.delete({
        collection: "case-attachments",
        id,
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["delete"]
    >[0]);

    return Response.json(deleted);
}
