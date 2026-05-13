import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Case = { id: string; title?: string };

type Task = {
    id: string;
    title?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
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

export default async function CareGroupHistoryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireUser();

    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const casesById = new Map(cases.docs.map((c) => [c.id, c] as const));

    const done = tasks.docs.filter((t) => t.status === "done");
    const upcoming = tasks.docs.filter((t) => t.status !== "done");

    return (
        <div>
            <h1 className="text-2xl font-semibold">Historique</h1>

            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">À venir</h2>
                <div className="mt-4 flex flex-col gap-2">
                    {upcoming.length ? (
                        upcoming.map((t) => {
                            const caseId =
                                typeof t.case === "string"
                                    ? t.case
                                    : t.case?.id;
                            const relatedCase = caseId
                                ? casesById.get(caseId)
                                : undefined;
                            const accent = caseId
                                ? caseAccentClasses(caseId)
                                : undefined;

                            return (
                                <div
                                    key={t.id}
                                    className={`rounded-2xl border border-border bg-card px-3 py-2 text-sm ${accent ? `border-l-4 ${accent.border}` : ""}`}
                                >
                                    <div className="font-medium">
                                        {t.title ?? t.id}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {t.status}
                                        {t.dueDate
                                            ? ` • ${formatDateFR(t.dueDate)}`
                                            : ""}
                                    </div>
                                    {relatedCase ? (
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${accent?.dot ?? "bg-muted"} ring-2 ${accent?.dotRing ?? "ring-border"}`}
                                            />
                                            <span className="truncate">
                                                {relatedCase.title ??
                                                    relatedCase.id}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-sm text-muted">Aucune tâche.</div>
                    )}
                </div>
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">Effectuées</h2>
                <div className="mt-4 flex flex-col gap-2">
                    {done.length ? (
                        done.map((t) => {
                            const caseId =
                                typeof t.case === "string"
                                    ? t.case
                                    : t.case?.id;
                            const relatedCase = caseId
                                ? casesById.get(caseId)
                                : undefined;
                            const accent = caseId
                                ? caseAccentClasses(caseId)
                                : undefined;

                            return (
                                <div
                                    key={t.id}
                                    className={`rounded-2xl border border-border bg-card px-3 py-2 text-sm ${accent ? `border-l-4 ${accent.border}` : ""}`}
                                >
                                    <div className="font-medium">
                                        {t.title ?? t.id}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {t.status}
                                        {t.dueDate
                                            ? ` • ${formatDateFR(t.dueDate)}`
                                            : ""}
                                    </div>
                                    {relatedCase ? (
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${accent?.dot ?? "bg-muted"} ring-2 ${accent?.dotRing ?? "ring-border"}`}
                                            />
                                            <span className="truncate">
                                                {relatedCase.title ??
                                                    relatedCase.id}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-sm text-muted">Aucune tâche.</div>
                    )}
                </div>
            </section>
        </div>
    );
}
