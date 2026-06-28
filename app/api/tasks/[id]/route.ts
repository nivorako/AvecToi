import { cookies } from "next/headers";
import { getPayload } from "payload";

import config from "@/payload.config";

export const runtime = "nodejs";

function getOriginFromRequestURL(requestURL: string): string {
    return new URL(requestURL).origin;
}

type PayloadMeResponse = {
    user?: { id: string } | null;
};

type TaskDoc = {
    id: string;
    status?: string;
    careGroup?: unknown;
    caseType?: unknown;
};

async function getUserIDFromTokenWithOrigin(args: {
    token: string;
    origin: string;
}): Promise<string | null> {
    const meRes = await fetch(`${args.origin}/api/users/me`, {
        headers: {
            Authorization: `JWT ${args.token}`,
        },
        cache: "no-store",
    });

    if (!meRes.ok) return null;

    const me = (await meRes.json()) as PayloadMeResponse;
    return me.user?.id ?? null;
}

async function authorizeTask(args: {
    token: string;
    taskID: string;
    origin: string;
}): Promise<
    | {
          ok: true;
          payload: Awaited<ReturnType<typeof getPayload>>;
          task: TaskDoc;
          role: string;
      }
    | { ok: false; status: number; message: string }
> {
    const userID = await getUserIDFromTokenWithOrigin({
        token: args.token,
        origin: args.origin,
    });
    if (!userID) return { ok: false, status: 401, message: "Unauthorized" };

    const payload = await getPayload({ config });

    const task = (await payload.findByID({
        collection: "tasks",
        id: args.taskID,
        depth: 0,
        overrideAccess: true,
        disableTransaction: true,
    } as unknown as Parameters<
        Awaited<ReturnType<typeof getPayload>>["findByID"]
    >[0])) as unknown as TaskDoc;

    const careGroupID =
        typeof task?.careGroup === "string" ||
        typeof task?.careGroup === "number"
            ? task.careGroup
            : (task?.careGroup as { id?: string | number } | undefined)?.id;

    if (!careGroupID) {
        return { ok: false, status: 400, message: "Invalid task" };
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
    if (!role) return { ok: false, status: 403, message: "Forbidden" };

    return { ok: true, payload, task, role };
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const token = (await cookies()).get("avectoi-token")?.value;
    if (!token) return new Response("Unauthorized", { status: 401 });

    const { id } = await params;
    const origin = getOriginFromRequestURL(req.url);

    const auth = await authorizeTask({ token, taskID: id, origin });
    if (!auth.ok) return new Response(auth.message, { status: auth.status });

    const canUpdate =
        auth.role === "owner" ||
        auth.role === "family" ||
        (auth.role === "professional" && auth.task?.caseType === "medical");

    if (!canUpdate) return new Response("Forbidden", { status: 403 });

    const json = (await req.json().catch(() => null)) as {
        status?: unknown;
        urgency?: unknown;
        subtasks?: unknown;
        description?: unknown;
    } | null;

    const updateData: Record<string, unknown> = {};

    // Handle status update (existing functionality)
    const status = typeof json?.status === "string" ? json.status.trim() : "";
    if (status === "todo" || status === "in_progress" || status === "done") {
        updateData.status = status;
    } else if (status !== "") {
        return new Response("Invalid status", { status: 400 });
    }

    // Handle urgency update (new functionality)
    const urgency =
        typeof json?.urgency === "string" ? json.urgency.trim() : "";
    if (urgency === "low" || urgency === "medium" || urgency === "high") {
        updateData.urgency = urgency;
    } else if (urgency !== "") {
        return new Response("Invalid urgency", { status: 400 });
    }

    // Handle subtasks update
    if (Array.isArray(json?.subtasks)) {
        updateData.subtasks = json.subtasks;
    }

    // Handle description update
    if (typeof json?.description === "string") {
        updateData.description = json.description;
    }

    if (Object.keys(updateData).length === 0) {
        return new Response("No valid fields to update", { status: 400 });
    }

    try {
        const updated = await auth.payload.update({
            collection: "tasks",
            id,
            data: updateData,
            overrideAccess: true,
            disableTransaction: true,
        } as unknown as Parameters<
            Awaited<ReturnType<typeof getPayload>>["update"]
        >[0]);

        return Response.json(updated);
    } catch (err) {
        console.error("tasks.patch.error", { id, err });
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorName = err instanceof Error ? err.name : "UnknownError";
        return Response.json(
            {
                error: "Failed to update task",
                id,
                errorName,
                errorMessage,
            },
            { status: 500 },
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const token = (await cookies()).get("avectoi-token")?.value;
    if (!token) return new Response("Unauthorized", { status: 401 });

    const { id } = await params;
    const origin = getOriginFromRequestURL(req.url);

    const auth = await authorizeTask({ token, taskID: id, origin });
    if (!auth.ok) return new Response(auth.message, { status: auth.status });

    const canDelete = auth.role === "owner" || auth.role === "family";
    if (!canDelete) return new Response("Forbidden", { status: 403 });

    if (auth.task?.status === "done") {
        return new Response("Task already done", { status: 400 });
    }

    try {
        const deleted = await auth.payload.delete({
            collection: "tasks",
            id,
            overrideAccess: true,
            disableTransaction: true,
        } as unknown as Parameters<
            Awaited<ReturnType<typeof getPayload>>["delete"]
        >[0]);

        return Response.json(deleted);
    } catch (err) {
        console.error("tasks.delete.error", { id, err });
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorName = err instanceof Error ? err.name : "UnknownError";
        return Response.json(
            {
                error: "Failed to delete task",
                id,
                errorName,
                errorMessage,
            },
            { status: 500 },
        );
    }
}
