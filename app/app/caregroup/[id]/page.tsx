import Link from "next/link";

import { revalidatePath } from "next/cache";

import AddDossierPanel from "@/components/caregroup/AddDossierPanel";
import AddTaskPanel from "@/components/caregroup/AddTaskPanel";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import TaskItemRow from "@/components/task/TaskItemRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

import PageSummary from "@/components/ui/PageSummary";

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
        
        <div className="flex flex-col gap-5">
            
            {/* Section 1 — Résumé du jour */}

            <PageSummary
                title="Résumé du jour"
                items={[
                    {
                        icon: "🗂️",
                        label: `${upcomingTasks.length} actions à faire aujourd'hui`,
                    },
                    {
                        icon: "📅",
                        label: `${upcomingTasks.filter(t => t.dueDate).length} rendez-vous à venir`,
                    },
                    {
                        icon: "💬",
                        label: "Messages non lus",
                    },
                ]}
                action={{ label: "Voir tout", href: `/app/caregroup/${id}/history` }}
            />

            {/* Section 3 — À traiter */}
            <div>
                <h2 className="text-base font-semibold mb-1">À traiter</h2>
                <p className="text-xs text-muted mb-3">Actions prioritaires</p>
                <div className="flex flex-col gap-2">
                    {upcomingTasks.length ? (
                        upcomingTasks.map((t) => {
                            const caseId = typeof t.case === "string" ? t.case : t.case?.id;
                            const caseTitle = typeof t.case === "object" ? t.case?.title : undefined;
                            return (
                                <Link
                                    key={t.id}
                                    href={caseId ? `/app/caregroup/${id}/case/${caseId}` : `/app/caregroup/${id}/tasks`}
                                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:bg-card/70 gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.urgency === "high" ? "bg-amber-50 text-amber-500" : "bg-primary/10 text-primary"}`}>
                                            {t.urgency === "high" ? (
                                                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{t.title ?? t.id}</div>
                                            {caseTitle && <div className="text-xs text-muted">{caseTitle}</div>}
                                            {t.dueDate && <div className="text-xs text-muted">Échéance : {formatDateFR(t.dueDate)}</div>}
                                        </div>
                                    </div>
                                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            Aucune tâche en cours.
                        </div>
                    )}
                </div>
            </div>

            {/* Section 4 — À venir */}
            <div>
                <h2 className="text-base font-semibold mb-1">À venir</h2>
                <p className="text-xs text-muted mb-3">Prochains rendez-vous</p>
                <div className="flex flex-col gap-2">
                    {upcomingTasks.filter(t => t.dueDate).length ? (
                        upcomingTasks.filter(t => t.dueDate).map((t) => {
                            const caseId = typeof t.case === "string" ? t.case : t.case?.id;
                            const d = t.dueDate ? new Date(t.dueDate) : null;
                            const dayLabel = d ? new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d) : "";
                            const timeLabel = d ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d) : "";
                            return (
                                <Link
                                    key={t.id}
                                    href={caseId ? `/app/caregroup/${id}/case/${caseId}` : `/app/caregroup/${id}/tasks`}
                                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:bg-card/70 gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{t.title ?? t.id}</div>
                                            <div className="text-xs text-muted capitalize">{dayLabel} • {timeLabel}</div>
                                        </div>
                                    </div>
                                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            Aucun rendez-vous à venir.
                        </div>
                    )}
                </div>
            </div>

            {/* Section 5 — Activité du groupe (placeholder) */}
            <div>
                <h2 className="text-base font-semibold mb-3">Activité du groupe</h2>
                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                    À venir.
                </div>
            </div>

        </div>
    );

}
