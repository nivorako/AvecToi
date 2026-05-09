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

export async function POST(req: Request) {
    const token = (await cookies()).get("avectoi-token")?.value;

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const caseID = url.searchParams.get("case") ?? "";

    if (!caseID) {
        return new Response("Missing case", { status: 400 });
    }

    const meRes = await fetch(`${getServerURL()}/api/users/me`, {
        headers: {
            Authorization: `JWT ${token}`,
        },
        cache: "no-store",
    });

    if (!meRes.ok) {
        return new Response("Unauthorized", { status: 401 });
    }

    const me = (await meRes.json()) as PayloadMeResponse;
    const userID = me.user?.id;

    if (!userID) {
        return new Response("Unauthorized", { status: 401 });
    }

    const payload = await getPayload({ config });

    // We use Payload Local API (instead of POSTing to /api/case-attachments) because on some
    // local Mongo setups transactions can abort during REST uploads. Local API lets us set
    // `disableTransaction: true` for a more reliable dev experience.

    const relatedCase = (await payload.findByID({
        collection: "cases",
        id: caseID,
        depth: 0,
        overrideAccess: true,
        disableTransaction: true,
    })) as { careGroup?: unknown; type?: unknown };

    const careGroupID =
        typeof relatedCase?.careGroup === "string" ||
        typeof relatedCase?.careGroup === "number"
            ? relatedCase.careGroup
            : (relatedCase?.careGroup as { id?: string | number } | undefined)
                  ?.id;

    if (!careGroupID) {
        return new Response("Invalid case", { status: 400 });
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
    });

    const role = (membership.docs[0] as { role?: string } | undefined)?.role;
    const caseType = relatedCase?.type;

    const canCreate =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && caseType === "medical");

    // We bypass Payload access control for the write, but we enforce the same rules here.
    // This keeps the API stable while avoiding transaction issues.

    if (!canCreate) {
        return new Response("Forbidden", { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const description = String(formData.get("description") ?? "");

    if (!(file instanceof File)) {
        return new Response("Missing file", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const created = await payload.create({
        collection: "case-attachments",
        data: {
            case: caseID,
            ...(description ? { description } : {}),
        },
        file: {
            data: buffer,
            mimetype: file.type || "application/octet-stream",
            name: file.name,
            size: file.size,
        },
        overrideAccess: true,
        disableTransaction: true,
    });

    return Response.json(created);
}
