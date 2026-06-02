import Link from "next/link";

import { revalidatePath } from "next/cache";

import AddDossierPanel from "@/components/caregroup/AddDossierPanel";
import AddTaskPanel from "@/components/caregroup/AddTaskPanel";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import TaskItemRow from "@/components/task/TaskItemRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type CareGroup = {
    id: string;
    name?: string;
};

type Patient = {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
};

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional" | "patient";
    user?: string | { id: string; name?: string };
    careGroup?: string;
};

type Task = {
    id: string;
    title?: string;
    createdAt?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
    urgency?: "low" | "high";
};

type Case = {
    id: string;
    title?: string;
    type?: "medical" | "custom";
};

type CaseDoc = {
    id: string;
    type?: "medical" | "custom";
    careGroup?: string | { id: string };
};

async function createTask(formData: FormData) {
    "use server";

    // Create Task server action for /app/caregroup/[id].
    //
    // Permissions (enforced here + by Payload ACL):
    // - owner/family: can create tasks for any case in the caregroup
    // - professional: can create tasks only for medical cases

    // Form values (untrusted input): validate again on the server.
    const careGroup = String(formData.get("careGroup") ?? "");
    const caseID = String(formData.get("case") ?? "");
    const title = String(formData.get("title") ?? "");
    const assignedTo = String(formData.get("assignedTo") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    const user = await requireUser();

    // Get caller role in this caregroup.
    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role) return;
    if (!caseID || !title) return;

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
                ...(assignedTo ? { assignedTo } : {}),
                ...(dueDate ? { dueDate } : {}),
            }),
        });
    } catch {
        return;
    }

    // Refresh the caregroup dashboard so the task list updates.
    revalidatePath(`/app/caregroup/${careGroup}`);
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
    revalidatePath(`/app/caregroup/${careGroup}`);
}

function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

function hashToIndex(input: string, modulo: number) {
    let h = 0;
    for (let i = 0; i < input.length; i += 1) {
        h = (h * 31 + input.charCodeAt(i)) >>> 0;
    }
    return h % modulo;
}

function caseAccentClasses(caseId: string) {
    const palette = [
        {
            border: "border-l-sky-300",
            dot: "bg-sky-400",
            dotRing: "ring-sky-200",
        },
        {
            border: "border-l-emerald-300",
            dot: "bg-emerald-400",
            dotRing: "ring-emerald-200",
        },
        {
            border: "border-l-violet-300",
            dot: "bg-violet-400",
            dotRing: "ring-violet-200",
        },
        {
            border: "border-l-amber-300",
            dot: "bg-amber-400",
            dotRing: "ring-amber-200",
        },
        {
            border: "border-l-rose-300",
            dot: "bg-rose-400",
            dotRing: "ring-rose-200",
        },
        {
            border: "border-l-teal-300",
            dot: "bg-teal-400",
            dotRing: "ring-teal-200",
        },
    ] as const;

    return palette[hashToIndex(caseId, palette.length)];
}

export default async function CareGroupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/caregroup/:id
    // Displays a caregroup dashboard (patients, cases, tasks).
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await requireUser();

    // Used for both UI permissions (which forms/actions to show) and basic navigation (Members page).
    // Note: Payload ACL is the real security boundary; the UI only hides actions for convenience.
    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    // Caregroup data (depth=0 is enough here).
    await payloadREST<CareGroup>(`/api/caregroups/${id}?depth=0`);

    // Cases and tasks are filtered by Payload access control.
    // The UI can safely show what the API returns for the current user.
    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=3&sort=-createdAt&depth=0`,
    );

    // Latest tasks for this caregroup.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    );

    // Get caregroup members for task assignment
    const careGroupMembers = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=1`,
    );
    const users = careGroupMembers.docs
        .map((m) => m.user)
        .filter(
            (u): u is { id: string; name?: string } =>
                u !== null && typeof u === "object",
        );

    const upcomingTasks = tasks.docs
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
            const aDue = a.dueDate
                ? new Date(a.dueDate).getTime()
                : Number.POSITIVE_INFINITY;
            const bDue = b.dueDate
                ? new Date(b.dueDate).getTime()
                : Number.POSITIVE_INFINITY;

            if (aDue !== bDue) return aDue - bDue;
            return String(a.title ?? a.id).localeCompare(
                String(b.title ?? b.id),
            );
        })
        .slice(0, 3);

    return (
        <div>
            <CareGroupBanner careGroupId={id} />

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader
                        title="Prochaines tâches"
                        action={
                            <Link
                                href={`/app/caregroup/${id}/tasks`}
                                className="text-sm font-semibold text-primary"
                            >
                                Voir plus
                            </Link>
                        }
                    />

                    <CardContent>
                        <div className="mt-4 flex flex-col gap-2">
                            {upcomingTasks.length ? (
                                upcomingTasks.map((t) => {
                                    const caseId =
                                        typeof t.case === "string"
                                            ? t.case
                                            : t.case?.id;
                                    return (
                                        <TaskItemRow
                                            key={t.id}
                                            taskID={t.id}
                                            title={t.title ?? t.id}
                                            createdAtLabel={
                                                t.createdAt
                                                    ? formatDateFR(t.createdAt)
                                                    : ""
                                            }
                                            careGroupId={id}
                                            caseId={caseId}
                                            urgency={t.urgency}
                                        />
                                    );
                                })
                            ) : (
                                <div className="mt-2 text-sm text-muted">
                                    Aucune tâche.
                                </div>
                            )}
                        </div>

                        {/* Patients can view tasks but not create them (read-only). */}
                        {membership?.role &&
                        ["owner", "family", "professional"].includes(
                            membership.role,
                        ) ? (
                            <AddTaskPanel
                                careGroupId={id}
                                defaultCaseId={cases.docs[0]?.id ?? ""}
                                cases={cases.docs}
                                action={createTask}
                                users={users}
                            />
                        ) : (
                            <div className="mt-4 text-sm text-muted">
                                Tu n’as pas les droits pour ajouter une task.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader
                        title="Dossiers récents"
                        action={
                            <Link
                                href={`/app/caregroup/${id}/dossiers`}
                                className="text-sm font-semibold text-primary"
                            >
                                Voir tout
                            </Link>
                        }
                    />

                    <CardContent>
                        <div className="mt-4 flex flex-col gap-2">
                            {cases.docs.length ? (
                                cases.docs.map((c) => {
                                    const accent = caseAccentClasses(c.id);

                                    return (
                                        <Link
                                            key={c.id}
                                            href={`/app/caregroup/${id}/case/${c.id}`}
                                            className={`rounded-2xl border border-border bg-card px-3 py-2 text-sm hover:bg-white/70 border-l-4 ${accent.border}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <span
                                                            className={`h-2.5 w-2.5 rounded-full ${accent.dot} ring-2 ${accent.dotRing}`}
                                                        />
                                                        <span className="truncate">
                                                            {c.title ?? c.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted">
                                                {c.type}
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="mt-2 text-sm text-muted">
                                    Aucun dossier.
                                </div>
                            )}
                        </div>

                        {/* Patients can view dossiers but not create them (read-only). */}
                        {membership?.role === "owner" ||
                        membership?.role === "family" ? (
                            <AddDossierPanel
                                careGroupId={id}
                                action={createCase}
                            />
                        ) : (
                            <div className="mt-4 text-sm text-muted">
                                Seul un owner ou un membre famille peut ajouter
                                un dossier.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <CardHeader
                        title="Messages récents"
                        action={
                            <Link
                                href={`/app/caregroup/${id}/messages`}
                                className="text-sm font-semibold text-primary"
                            >
                                Voir tout
                            </Link>
                        }
                    />
                    <CardContent>
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            À venir.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
