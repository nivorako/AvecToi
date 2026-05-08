import Link from "next/link";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type CareGroup = { id: string; name?: string };

type Patient = {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
};

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional";
    user?: string;
    careGroup?: string;
};

async function createTask(formData: FormData) {
    "use server";

    // Create Task server action for /app/caregroups/[id].
    //
    // Permissions (enforced here + by Payload ACL):
    // - owner/family: can create tasks for any case in the caregroup
    // - professional: can create tasks only for medical cases

    // Form values (untrusted input): validate again on the server.
    const careGroup = String(formData.get("careGroup") ?? "");
    const caseID = String(formData.get("case") ?? "");
    const title = String(formData.get("title") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    const user = await requireUser();

    // Get caller role in this caregroup.
    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role) return;
    if (!caseID || !title) return;

    type CaseDoc = {
        id: string;
        type?: "medical" | "custom";
        careGroup?: string | { id: string };
    };
    // Fetch the target case to validate it belongs to this caregroup (anti-tampering guard).
    const relatedCase = await payloadREST<CaseDoc>(
        `/api/cases/${encodeURIComponent(caseID)}?depth=0`,
    );

    const relatedCaseCareGroup =
        typeof relatedCase?.careGroup === "string"
            ? relatedCase.careGroup
            : relatedCase?.careGroup?.id;

    // Prevent creating a task for a case outside of the current caregroup.
    if (!relatedCaseCareGroup || relatedCaseCareGroup !== careGroup) return;

    const canCreate =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && relatedCase?.type === "medical");

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

    // Refresh the caregroup dashboard so the task list updates.
    revalidatePath(`/app/caregroups/${careGroup}`);
}

async function createCase(formData: FormData) {
    "use server";

    // Only owner/family can create cases in the caregroup.
    const careGroup = String(formData.get("careGroup") ?? "");
    const title = String(formData.get("title") ?? "");
    const type = String(formData.get("type") ?? "");

    const user = await requireUser();

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (membership?.role !== "owner" && membership?.role !== "family") return;
    if (!title || (type !== "medical" && type !== "custom")) return;

    let defaultPatientID = await payloadREST<{ docs: Patient[] }>(
        `/api/patients?where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]?.id);

    if (!defaultPatientID && membership?.role === "owner") {
        try {
            const created = await payloadREST<{ id: string }>("/api/patients", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    careGroup,
                    firstName: "Patient",
                    lastName: "",
                }),
            });
            defaultPatientID = created?.id;
        } catch {
            return;
        }
    }

    if (!defaultPatientID) return;

    try {
        await payloadREST("/api/cases", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                careGroup,
                patient: defaultPatientID,
                title,
                type,
            }),
        });
    } catch {
        return;
    }

    // Refresh to show the newly created case.
    revalidatePath(`/app/caregroups/${careGroup}`);
}

type Case = { id: string; title?: string; type?: "medical" | "custom" };

type Task = {
    id: string;
    title?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
};

export default async function CareGroupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/caregroups/:id
    // Displays a caregroup dashboard (patients, cases, tasks).
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await requireUser();

    // Used for both permissions (which forms/actions to show) and basic navigation (Members page).
    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    // Basic caregroup info.
    const careGroup = await payloadREST<CareGroup>(
        `/api/caregroups/${id}?depth=0`,
    );

    // Patients belonging to this caregroup.
    // Cases and tasks are filtered by Payload access control.
    // The UI can safely show what the API returns for the current user.
    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=20&depth=0`,
    );

    // Latest tasks for this caregroup.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=20&depth=0`,
    );

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                    <Link href="/app" className="text-sm font-semibold">
                        Avec Toi
                    </Link>
                    <div className="flex items-center gap-3">
                        {membership?.role === "owner" ||
                        membership?.role === "family" ? (
                            <Link
                                href={`/app/caregroups/${id}/members`}
                                className="btn-secondary"
                            >
                                Membres
                            </Link>
                        ) : null}
                        <div className="text-sm text-muted">
                            {user.name ?? user.email ?? user.id}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-6 py-8">
                <h1 className="text-2xl font-semibold">
                    {careGroup?.name ?? careGroup?.id ?? id}
                </h1>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <h2 className="text-base font-semibold">
                            Dossiers (filtrés par rôle)
                        </h2>

                        {membership?.role === "owner" ||
                        membership?.role === "family" ? (
                            <form
                                action={createCase}
                                className="mt-4 flex flex-col gap-2"
                            >
                                <input
                                    type="hidden"
                                    name="careGroup"
                                    value={id}
                                />
                                <input
                                    name="title"
                                    placeholder="Titre"
                                    className="input"
                                    required
                                />
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <select
                                        name="type"
                                        className="input"
                                        required
                                        defaultValue="medical"
                                    >
                                        <option value="medical">Medical</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary">
                                    Ajouter dossier
                                </button>
                            </form>
                        ) : (
                            <div className="mt-4 text-sm text-muted">
                                Seul un owner ou un membre famille peut ajouter
                                un dossier.
                            </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2">
                            {cases.docs.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/app/cases/${c.id}`}
                                    className="rounded-2xl border border-border bg-card px-3 py-2 text-sm hover:bg-white/70"
                                >
                                    <div className="font-medium">
                                        {c.title ?? c.id}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {c.type}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <h2 className="text-base font-semibold">
                            Tâches (filtrées par rôle)
                        </h2>

                        {membership?.role &&
                        ["owner", "family", "professional"].includes(
                            membership.role,
                        ) ? (
                            <form
                                action={createTask}
                                className="mt-4 flex flex-col gap-2"
                            >
                                <input
                                    type="hidden"
                                    name="careGroup"
                                    value={id}
                                />
                                <input
                                    name="title"
                                    placeholder="Titre"
                                    className="input"
                                    required
                                />
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <select
                                        name="case"
                                        className="input"
                                        required
                                        defaultValue={cases.docs[0]?.id ?? ""}
                                    >
                                        {cases.docs.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.title ?? c.id}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        name="dueDate"
                                        className="input"
                                    />
                                </div>
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
                </div>
            </main>
        </div>
    );
}
