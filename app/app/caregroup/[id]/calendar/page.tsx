import Link from "next/link";

import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Task = {
    id: string;
    title?: string;
    dueDate?: string;
    status?: string;
    urgency?: "low" | "high";
    case?: string | { id: string; title?: string; type?: string };
};

function formatDayLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sameDay = (a: Date, b: Date) =>
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();

    const timeLabel = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);

    if (sameDay(d, today)) return `Aujourd'hui • ${timeLabel}`;
    if (sameDay(d, tomorrow)) return `Demain • ${timeLabel}`;

    const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d);
    return `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} • ${timeLabel}`;
}

function buildCalendarGrid(year: number, month: number, dueDates: Set<string>) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: { day: number | null; hasEvent: boolean }[] = [];

    for (let i = 0; i < startDow; i++) days.push({ day: null, hasEvent: false });
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        days.push({ day: d, hasEvent: dueDates.has(key) });
    }
    return days;
}

const MONTH_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const CASE_ICONS: Record<string, string> = {
    medical: "🏥",
    custom: "📄",
};

export default async function CareGroupCalendarPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireUser();

    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&sort=dueDate&depth=1`,
    );

    const now = new Date();
    const upcomingTasks = tasks.docs.filter(
        (t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) >= now,
    );
    const urgentTasks = tasks.docs.filter(
        (t) => t.status !== "done" && (t.urgency === "high" || !t.dueDate),
    ).slice(0, 4);

    const thisWeekTasks = upcomingTasks.filter((t) => {
        const d = new Date(t.dueDate!);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + 7);
        return d <= weekEnd;
    });

    const medicalTasks = upcomingTasks.filter((t) => {
        const c = t.case;
        return typeof c === "object" && c?.type === "medical";
    });

    const dueDates = new Set(
        tasks.docs
            .filter((t) => t.dueDate)
            .map((t) => t.dueDate!.slice(0, 10)),
    );

    const year = now.getFullYear();
    const month = now.getMonth();
    const calDays = buildCalendarGrid(year, month, dueDates);
    const today = now.getDate();

    return (
        <div className="flex flex-col gap-5 pb-20">

            {/* Section 1 — Résumé */}
            <div className="rounded-2xl bg-primary/10 p-4">
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                        <span>📅</span>
                        <span>{upcomingTasks.length} événements à venir</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600">
                        <span>⚠️</span>
                        <span>{thisWeekTasks.length} échéances cette semaine</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>🏥</span>
                        <span>{medicalTasks.length} rendez-vous médical{medicalTasks.length > 1 ? "x" : ""} à venir</span>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Link
                        href={`/app/caregroup/${id}/history`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                        Voir tout
                    </Link>
                </div>
            </div>

            {/* Section 2+3 — Grille calendrier mensuelle */}
            <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">
                        {MONTH_FR[month]} {year}
                    </span>
                    <div className="flex rounded-full ring-1 ring-border overflow-hidden text-xs font-medium">
                        <span className="px-3 py-1.5 bg-card text-muted">Semaine</span>
                        <span className="px-3 py-1.5 bg-primary text-white">Mois</span>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted mb-1">
                    {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                        <span key={i}>{d}</span>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                    {calDays.map((cell, i) => (
                        <div key={i} className="relative flex flex-col items-center py-1">
                            {cell.day ? (
                                <span
                                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                        cell.day === today
                                            ? "bg-primary text-white font-bold"
                                            : "text-foreground"
                                    }`}
                                >
                                    {cell.day}
                                </span>
                            ) : null}
                            {cell.hasEvent && cell.day ? (
                                <span className="mt-0.5 h-1 w-1 rounded-full bg-primary/70" />
                            ) : null}
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted">● = événement ou échéance</p>
            </div>

            {/* Section 4 — À venir (urgentes en premier) */}
            <div>
                <h2 className="text-base font-semibold mb-1">À venir</h2>
                <div className="flex flex-col gap-2">
                    {[
                        ...tasks.docs.filter((t) => t.status !== "done" && t.urgency === "high"),
                        ...tasks.docs.filter((t) => t.status !== "done" && t.urgency !== "high" && t.dueDate && new Date(t.dueDate) >= now),
                    ].slice(0, 6).map((t) => {
                        const isUrgent = t.urgency === "high";
                        const caseObj = typeof t.case === "object" ? t.case : null;
                        const caseId = caseObj?.id ?? (typeof t.case === "string" ? t.case : undefined);
                        const caseTitle = caseObj?.title;
                        const caseType = caseObj?.type ?? "";
                        return (
                            <Link
                                key={t.id}
                                href={caseId ? `/app/caregroup/${id}/case/${caseId}` : `/app/caregroup/${id}/history`}
                                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:bg-card/70 gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl ${isUrgent ? "bg-amber-50 text-amber-500" : "bg-primary/10"}`}>
                                        {isUrgent ? (
                                            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                <line x1="12" y1="9" x2="12" y2="13" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        ) : (
                                            CASE_ICONS[caseType] ?? "📅"
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{t.title ?? t.id}</div>
                                        {t.dueDate ? (
                                            <div className={`text-xs ${isUrgent ? "text-amber-600" : "text-muted"}`}>
                                                {isUrgent
                                                    ? `Échéance : ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(t.dueDate))}`
                                                    : formatDayLabel(t.dueDate)
                                                }
                                            </div>
                                        ) : null}
                                        {caseTitle && (
                                            <div className="text-xs text-muted">Dossier {caseTitle}</div>
                                        )}
                                    </div>
                                </div>
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </Link>
                        );
                    })}
                    {tasks.docs.filter((t) => t.status !== "done").length === 0 && (
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            Aucun événement à venir.
                        </div>
                    )}
                </div>
            </div>

            {/* Section 5 — Activité calendrier (placeholder) */}
            <div>
                <h2 className="text-base font-semibold mb-3">Activité calendrier</h2>
                <div className="flex flex-col gap-2">
                    {[
                        { initial: "M", name: "Marie", action: "A créé un rendez-vous", when: "il y a 20 min" },
                        { initial: "P", name: "Paul", action: "A déplacé un rendez-vous", when: "Aujourd'hui" },
                        { initial: "J", name: "Julie", action: "A ajouté une échéance", when: "Hier" },
                    ].map((item) => (
                        <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {item.initial}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold">{item.name}</div>
                                <div className="text-xs text-muted">{item.action}</div>
                                <div className="text-xs text-muted">{item.when}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bouton flottant — Ajouter un événement */}
            <div className="fixed bottom-24 right-4 z-30">
                <Link
                    href={`/app/caregroup/${id}/history`}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 text-2xl"
                    aria-label="Ajouter un événement"
                >
                    +
                </Link>
            </div>

        </div>
    );
}
