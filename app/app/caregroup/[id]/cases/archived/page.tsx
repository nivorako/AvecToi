import { restoreCase } from "../../case/action";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Case = {
    id: string;
    title?: string;
    type?: string;
    updatedAt?: string;
    careGroup?: string | { id: string };
};

type CasesResponse = {
    docs: Case[];
    totalDocs: number;
};


type CaseType =
    | "medical"
    | "administrative"
    | "transport"
    | "financial"
    | "social"
    | "legal"
    | "other";

const CATEGORY_CONFIG: Record<
    CaseType,
    { icon: string; color: string }
> = {
    medical: {
        icon: "medical-icon",
        color: "bg-sky-100 text-sky-600",
    },
    administrative: {
        icon: "administrative-icon",
        color: "bg-indigo-100 text-indigo-600",
    },
    transport: {
        icon: "transport-icon",
        color: "bg-amber-100 text-amber-600",
    },
    financial: {
        icon: "financial-icon",
        color: "bg-emerald-100 text-emerald-600",
    },
    social: {
        icon: "social-icon",
        color: "bg-violet-100 text-violet-600",
    },
    legal: {
        icon: "legal-icon",
        color: "bg-rose-100 text-rose-600",
    },
    other: {
        icon: "other-icon",
        color: "bg-slate-100 text-slate-600",
    },
};


const CATEGORY_LABELS: Record<CaseType, string> = {
    medical: "Médical",
    administrative: "Administratif",
    transport: "Transport",
    financial: "Financier",
    social: "Social",
    legal: "Juridique",
    other: "Autre",
};

function formatLastActivity(date?: string) {
    if (!date) return "Date inconnue";

    const activityDate = new Date(date);

    if (Number.isNaN(activityDate.getTime())) {
        return "Date inconnue";
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (activityDate.toDateString() === today.toDateString()) {
        return "Aujourd'hui";
    }

    if (activityDate.toDateString() === yesterday.toDateString()) {
        return "Hier";
    }

    return activityDate.toLocaleDateString("fr-FR");
}


export default async function ArchivedCasesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireUser();

    const { id } = await params;

    const casesRes = await payloadREST<CasesResponse>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&where[status][equals]=archived&limit=50&depth=0`,
    );

    const archivedCases = casesRes.docs;

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-xl font-semibold">
                    Dossiers archivés
                </h1>

                <p className="mt-1 text-sm text-muted">
                    {archivedCases.length} dossier(s) archivé(s)
                </p>
            </div>

            {archivedCases.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                    <p className="text-sm text-muted">
                        Aucun dossier archivé pour le moment.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {archivedCases.map((caseItem) => {
                        const type: CaseType =
                            caseItem.type && caseItem.type in CATEGORY_CONFIG
                                ? (caseItem.type as CaseType)
                                : "other";

                        return (
                            <div
                                key={caseItem.id}
                                className="rounded-xl border border-border bg-card p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${CATEGORY_CONFIG[type].color}`}
                                    >
                                        📁
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-medium">
                                                {caseItem.title || "Dossier sans titre"}
                                            </h2>

                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                Archivé
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-muted">
                                            {CATEGORY_LABELS[type]}
                                        </p>

                                        <p className="mt-2 text-xs text-muted">
                                            Dernière activité :{" "}
                                            {formatLastActivity(caseItem.updatedAt)}
                                        </p>
                                        <a
                                            href={`/app/caregroup/${id}/case/${caseItem.id}`}
                                            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                                        >
                                            Consulter →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
