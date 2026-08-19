import { revalidatePath } from "next/cache";

import Link from "next/link";
import PageSummary from "@/components/ui/PageSummary";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

import { archiveCase, deleteCase } from "../../case/action"; 

type Message = {
    id: string;
    content?: string;
    createdAt?: string;
    author?: string | { id: string; name?: string; email?: string };
};

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional" | "patient";
    user?: string | { id: string; name?: string };
    careGroup?: string;
};

type CaseDoc = {
    id: string;
    title?: string;
    type?: string;
    description?: string;
    status?: string;
    careGroup?: string | { id: string; name?: string };
};

type Task = {
    id: string;
    title?: string;
    createdAt?: string;
    status?: string;
    dueDate?: string;
    assignedTo?: string;
    urgency?: "low" | "high";
};

type CaseInformation = {
    id: string;
    category?: "doctor" | "insurance" | "contact" | "other";
    title?: string;
    subtitle?: string;
    phone?: string;
    notes?: string;
};

type CaseAttachment = {
    id: string;
    filename?: string;
    displayName?: string;
    mimeType?: string;
    url?: string;
    description?: string;
};

type TaskAttachment = {
    id: string;
    filename?: string;
    displayName?: string;
    mimeType?: string;
    url?: string;
    description?: string;
    task?: string;
};

function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

export default async function CasePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; caseId: string }>;
    searchParams: Promise<{ allTodo?: string; allDone?: string }>;
}) {
    // Route: /app/caregroup/:id/case/:caseId
    // Displays a case details page with its tasks.
    // Tasks, and the create UI below, are filtered by role via Payload access control.
    const { id, caseId } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await requireUser();

    // Case data (depth=1 to populate relationships like careGroup).
    const caseDoc = await payloadREST<CaseDoc>(`/api/cases/${caseId}?depth=1`);

    // Used to render a "Retour caregroup" link when available.
    const careGroupID =
        typeof caseDoc?.careGroup === "string"
            ? caseDoc.careGroup
            : caseDoc?.careGroup?.id;

    // Tasks belonging to this case.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[case][equals]=${encodeURIComponent(caseId)}&limit=50&depth=0`,
    );

    const { allTodo, allDone } = await searchParams;
    const showAllTodo = allTodo === "1";
    const showAllDone = allDone === "1";
    const baseUrl = `/app/caregroup/${id}/case/${caseId}`;

    function buildHref(next: { allTodo?: boolean; allDone?: boolean }) {
        const parts: string[] = [];

        const nextTodo = next.allTodo ?? showAllTodo;
        const nextDone = next.allDone ?? showAllDone;

        if (nextTodo) parts.push("allTodo=1");
        if (nextDone) parts.push("allDone=1");

        return parts.length ? `${baseUrl}?${parts.join("&")}` : baseUrl;
    }

    // Membership is optional here (case might not have a caregroup populated in edge cases).
    const membership = careGroupID
        ? await payloadREST<{ docs: Membership[] }>(
              `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=1&depth=0`,
          ).then((r) => r.docs[0])
        : undefined;

    // Get caregroup members for task assignment
    const careGroupMembers = careGroupID
        ? await payloadREST<{ docs: Membership[] }>(
              `/api/memberships?where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=100&depth=1`,
          )
        : { docs: [] };

    const users = careGroupMembers.docs
        .map((m) => m.user)
        .filter(
            (u): u is { id: string; name?: string } =>
                u !== null && typeof u === "object",
        );

    const role = membership?.role;

    const normalizedCaseType =
        caseDoc?.type === "medical" || caseDoc?.type === "custom"
            ? caseDoc.type
            : "";

    const canCreateTask =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && normalizedCaseType === "medical");

    // UI permissions:
    // - patients are read-only on dossiers (no tasks creation, no attachments upload, no notes edits)
    // - we still rely on Payload access control as the real security boundary

    const attachments = await payloadREST<{ docs: CaseAttachment[] }>(
        `/api/case-attachments?where[case][equals]=${encodeURIComponent(caseId)}&limit=50&depth=0`,
    );

    const caseInformations = await payloadREST<{ docs: CaseInformation[] }>(
        `/api/case-informations?where[case][equals]=${encodeURIComponent(caseId)}&limit=100&depth=0`,
    );

    // Ajouter après les autres récupérations de données (après ligne 268)
    // Récupérer les messages du careGroup pour afficher le compteur
    const messages = careGroupID
        ? await payloadREST<{ docs: Message[] }>(
            `/api/messages?where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=50&sort=-createdAt&depth=1`,
        )
        : { docs: [] };
 
    const today = new Date();

    const todayMessages = messages.docs.filter((m) => {
        if (!m.createdAt) return false;
        const d = new Date(m.createdAt);
        return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
        );
    });
 
    // Actions importantes : urgentes + échéance dans moins de 7 jours
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    const importantTasks = tasks.docs.filter((t) => {
        if (t.status === "done") return false;
        const isUrgent = t.urgency === "high";
        const isDueSoon =
            t.dueDate &&
            new Date(t.dueDate).getTime() <= in7Days.getTime() &&
            new Date(t.dueDate).getTime() >= now.getTime();
        return isUrgent || isDueSoon;
    });

    // Récupérer les task-attachments liés aux tâches de cette case
    const taskAttachments = await payloadREST<{ docs: TaskAttachment[] }>(
        `/api/task-attachments?where[task][in]=${tasks.docs.map((t) => t.id).join(",")}&limit=50&depth=0`,
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
        });

    const doneTasks = tasks.docs
        .filter((t) => t.status === "done")
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
        });

    return (
        <div>
            
            {/* Section 1 — Résumé du dossier */}

            <PageSummary
                title={`Dossier ${caseDoc.title ?? ""}`}
                items={[
                    {
                        icon: "📅",
                        label: `${upcomingTasks.filter((t) => t.dueDate).length} rendez-vous à venir`,
                    },
                    {
                        icon: "💬",
                        label: `${todayMessages.length} nouveaux messages aujourd'hui`,
                    },
                    {
                        icon: "📝",
                        label: caseDoc?.description ? "Notes ajoutées" : "Aucune note",
                    },
                ]}
                 extraAction={
                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/informations`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
                        style={{color:"white"}}
                    >
                        Ajouter une information
                    </Link>
                }
            />

                        {/* Section 2 — Actions importantes */}
            <div className="mt-4">
                <h2 className="text-base font-bold mb-3">Actions importantes</h2>
                {importantTasks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {importantTasks.map((t) => (
                            <Link
                                key={t.id}
                                href={`/app/caregroup/${id}/case/${caseId}/tasks`}
                                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm hover:bg-amber-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span>{t.urgency === "high" ? "⚠️" : "📅"}</span>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{t.title ?? t.id}</span>
                                        {t.dueDate && (
                                            <span className="text-xs text-muted">
                                                avant le {formatDateFR(t.dueDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-muted">›</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                        Pas d'actions prévues pour la semaine à venir
                    </div>
                )}
            </div>

            {/* Section 3 — Accès aux sections */}
            <div className="mt-4">
                <h2 className="text-base font-bold mb-3">Accès aux sections</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/documents`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>📄</span>
                            <span>Documents ({attachments.docs.length + taskAttachments.docs.length})</span>
                        </div>
                        <span className="text-muted">›</span>
                    </Link>

                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/tasks`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>✅</span>
                            <span>Tâches ({upcomingTasks.length})</span>
                        </div>
                        <span className="text-muted">›</span>
                    </Link>

                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/calendar`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>Calendrier ({upcomingTasks.filter(t => t.dueDate).length})</span>
                        </div>
                        <span className="text-muted">›</span>
                    </Link>

                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/messages`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>💬</span>
                            <span>Messages ({messages.docs.length})</span>
                        </div>
                        <span className="text-muted">›</span>
                    </Link>

                    <Link
                        href={`/app/caregroup/${id}/case/${caseId}/notes`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>📝</span>
                            <span>Notes ({caseDoc?.description ? 1 : 0})</span>
                        </div>
                        <span className="text-muted">›</span>
                    </Link>
                </div>
            </div>

                        {/* Section 4 — Informations du dossier */}
            <div className="mt-4">
                <h2 className="text-base font-bold mb-3">Informations</h2>
                {caseInformations.docs.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                        Ex. personne à contacter.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {caseInformations.docs.map((info) => (
                            <div
                                key={info.id}
                                className="rounded-2xl border border-border bg-card p-3"
                            >
                                <div className="text-xs font-medium text-primary">
                                    {info.category === "doctor"
                                        ? "Médecin"
                                        : info.category === "insurance"
                                          ? "Mutuelle / Assurance"
                                          : info.category === "contact"
                                            ? "Contact"
                                            : "Autre"}
                                </div>
                                <div className="font-medium">{info.title ?? "Sans titre"}</div>
                                {info.subtitle && (
                                    <div className="text-sm text-muted">{info.subtitle}</div>
                                )}
                                {info.phone && (
                                    <div className="text-sm text-muted">📞 {info.phone}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

                        {/* Section 5 — Responsables */}
            <div className="mt-4">
                <h2 className="text-base font-bold mb-3">Responsables</h2>
                <div className="flex flex-col gap-2">
                    {(() => {
                        const assignedUserIds = tasks.docs
                            .filter(t => t.assignedTo)
                            .map(t => t.assignedTo as string);
                        const uniqueIds = Array.from(new Set(assignedUserIds));

                        if (uniqueIds.length === 0) {
                            return (
                                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                                    Aucun responsable assigné.
                                </div>
                            );
                        }

                        return uniqueIds.map(userId => {
                            const user = users.find(u => u.id === userId);
                            return (
                                <div key={userId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                                        {(user?.name?.[0] ?? "?").toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user?.name ?? "Inconnu"}</span>
                                        <span className="text-xs text-muted">Responsable</span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* daanger zone */}
            {role === "owner" && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <h2 className="text-sm font-semibold text-rose-700 mb-3">Zone de danger</h2>
                    <div className="flex flex-col gap-2">
                        <form action={archiveCase}>
                            <input type="hidden" name="case" value={caseId} />
                            <input type="hidden" name="careGroup" value={careGroupID ?? ""} />
                            <button type="submit" className="w-full rounded-xl bg-white border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                                Archiver ce dossier
                            </button>
                        </form>
                        <form action={deleteCase}>
                            <input type="hidden" name="case" value={caseId} />
                            <input type="hidden" name="careGroup" value={careGroupID ?? ""} />
                            <button type="submit" className="w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
                                Supprimer définitivement
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
