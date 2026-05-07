import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional";
    user?: string;
    careGroup?: string;
};

type CaseDoc = {
    id: string;
    title?: string;
    type?: string;
    description?: string;
    careGroup?: string | { id: string; name?: string };
};

type Task = { id: string; title?: string; status?: string; dueDate?: string };

async function createTask(formData: FormData) {
    "use server";

    // Create Task server action for /app/cases/[id].
    //
    // Permissions (enforced here + by Payload ACL):
    // - owner/family: can create tasks for the case
    // - professional: can create tasks only when the case is medical

    const caseID = String(formData.get("case") ?? "");
    const careGroup = String(formData.get("careGroup") ?? "");
    const caseType = String(formData.get("caseType") ?? "");
    const title = String(formData.get("title") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    const user = await requireUser();

    if (!caseID || !careGroup || !title) return;
    if (caseType !== "medical" && caseType !== "custom") return;

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    const canCreate =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && caseType === "medical");

    if (!canCreate) return;

    try {
        await payloadREST("/api/tasks", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                case: caseID,
                title,
                status: "todo",
                ...(dueDate ? { dueDate } : {}),
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/cases/${caseID}`);
}

export default async function CasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/cases/:id
    // Displays a case details page with its tasks.
    // Tasks, and the create UI below, are filtered by role via Payload access control.
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await requireUser();

    // Case data (depth=1 to populate relationships like careGroup).
    const caseDoc = await payloadREST<CaseDoc>(`/api/cases/${id}?depth=1`);

    // Used to render a "Retour caregroup" link when available.
    const careGroupID =
        typeof caseDoc?.careGroup === "string"
            ? caseDoc.careGroup
            : caseDoc?.careGroup?.id;

    // Tasks belonging to this case.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[case][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    );

    const membership = careGroupID
        ? await payloadREST<{ docs: Membership[] }>(
              `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=1&depth=0`,
          ).then((r) => r.docs[0])
        : undefined;

    const role = membership?.role;
    const normalizedCaseType =
        caseDoc?.type === "medical" || caseDoc?.type === "custom"
            ? caseDoc.type
            : "";
    const canCreateTask =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && normalizedCaseType === "medical");

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                    <Link href="/app" className="text-sm font-semibold">
                        Avec Toi
                    </Link>
                    <div className="text-sm text-muted">
                        {user.name ?? user.email ?? user.id}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-6 py-8">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {caseDoc?.title ?? caseDoc?.id ?? id}
                        </h1>
                        <div className="mt-1 text-sm text-zinc-600">
                            {caseDoc?.type}
                        </div>
                    </div>

                    {careGroupID ? (
                        <Link
                            href={`/app/caregroups/${careGroupID}`}
                            className="btn-secondary"
                        >
                            Retour caregroup
                        </Link>
                    ) : null}
                </div>

                {caseDoc?.description ? (
                    <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
                        {caseDoc.description}
                    </div>
                ) : null}

                <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">Tasks</h2>

                    {canCreateTask ? (
                        <form
                            action={createTask}
                            className="mt-4 flex flex-col gap-2"
                        >
                            <input type="hidden" name="case" value={id} />
                            <input
                                type="hidden"
                                name="careGroup"
                                value={careGroupID ?? ""}
                            />
                            <input
                                type="hidden"
                                name="caseType"
                                value={normalizedCaseType}
                            />
                            <input
                                name="title"
                                placeholder="Titre"
                                className="input"
                                required
                            />
                            <input
                                type="date"
                                name="dueDate"
                                className="input"
                            />
                            <button type="submit" className="btn-primary">
                                Ajouter task
                            </button>
                        </form>
                    ) : (
                        <div className="mt-4 text-sm text-muted">
                            Tu n’as pas les droits pour ajouter une task.
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2">
                        {tasks.docs.map((t) => (
                            <div
                                key={t.id}
                                className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
                            >
                                <div className="font-medium">
                                    {t.title ?? t.id}
                                </div>
                                <div className="text-xs text-muted">
                                    {t.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
