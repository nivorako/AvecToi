import { cookies } from "next/headers";
import { getPayload } from "payload";

import {
    safeStoredMimeType,
    validateUploadFile,
    validateUploadRequestSize,
} from "@/lib/uploads";

import config from "@/payload.config";

export const runtime = "nodejs";

function getOriginFromRequestURL(requestURL: string): string {
    return new URL(requestURL).origin;
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
    const taskID = url.searchParams.get("task") ?? "";

    if (!taskID) {
        return new Response("Missing task", { status: 400 });
    }

    const origin = getOriginFromRequestURL(req.url);

    const meRes = await fetch(`${origin}/api/users/me`, {
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

    // We use Payload Local API (instead of POSTing to /api/task-attachments) because on some
    // local Mongo setups transactions can abort during REST uploads. Local API lets us set
    // `disableTransaction: true` for a more reliable dev experience.

    const relatedTask = (await payload.findByID({
        collection: "tasks",
        id: taskID,
        depth: 0,
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["findByID"]
    >[0])) as { careGroup?: unknown; caseType?: unknown; case?: unknown; };

    const rawCase = relatedTask?.case;

    // Extract case ID from various possible shapes
    const caseID =
        typeof rawCase === "string" || typeof rawCase === "number"
            ? rawCase
            : (rawCase as { id?: string | number } | undefined)?.id;

    if (!caseID) {
        return new Response("Invalid case", { status: 400 });
    }

    const relatedCase = await payload.findByID({
        collection: "cases",
        id: caseID,
        depth: 0,
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["findByID"]
    >[0]);

    // Check if case is archived
    if (relatedCase.status !== "active") {
        return Response.json(
            { message: "Un dossier archivé est en lecture seule." },
            { status: 403 },
        );
    }

    const careGroupID =
    typeof relatedCase?.careGroup === "string" ||
    typeof relatedCase?.careGroup === "number"
        ? relatedCase.careGroup
        : (
              relatedCase?.careGroup as {
                  id?: string | number;
              } | undefined
          )?.id;

    if (!careGroupID) {
        return new Response("Invalid task", { status: 400 });
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

    if (!role) {
        return Response.json(
            { message: "Aucune adhésion trouvée pour le CareGroup de cette tâche." },
            { status: 403 },
        );
    }
 
    if (
        role === "professional" &&
        relatedCase.type !== "medical"
    ) {
        return Response.json(
            {
                message:
                    "Un professionnel ne peut ajouter un document qu'à une tâche médicale.",
            },
            { status: 403 },
        );
    }
    
    const canCreate =
        role === "admin" ||
        role === "family" ||
        role === "professional";  

    // We bypass Payload access control for the write, but we enforce the same rules here.
    // This keeps the API stable while avoiding transaction issues.

    if (!canCreate) {
         return Response.json(
        { message: "Vous n'avez pas la permission d'ajouter un document." },
        { status: 403 },
    );
    }

    const requestSizeError = validateUploadRequestSize(req);
    if (requestSizeError) {
        return requestSizeError;
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const description = String(formData.get("description") ?? "");

    if (!(file instanceof File)) {
        return new Response("Missing file", { status: 400 });
    }

    const fileError = validateUploadFile(file);
    if (fileError) {
        return fileError;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const created = await payload.create({
        collection: "task-attachments",
        data: {
            task: taskID,
            ...(description ? { description } : {}),
        },
        file: {
            data: buffer,
            mimetype: safeStoredMimeType(file.type),
            name: file.name,
            size: file.size,
        },
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["create"]
    >[0]);

    return Response.json(created);
}
