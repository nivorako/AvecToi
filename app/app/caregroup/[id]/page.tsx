import Link from "next/link";

import PageSummary from "@/components/ui/PageSummary";

import { payloadREST } from "@/lib/payloadRest";

type CareGroup = {
    id: string;
    name?: string;
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


function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

export default async function CareGroupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/caregroup/:id
    // Displays a caregroup dashboard (patients, cases, tasks).
    const { id } = await params;

    // Caregroup data (depth=0 is enough here).
    await payloadREST<CareGroup>(`/api/caregroups/${id}?depth=0`);

    // Latest tasks for this caregroup.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
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
