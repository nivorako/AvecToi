
import AddDossierPanel from "@/components/caregroup/AddDossierPanel";
import PageSummary from "@/components/ui/PageSummary";

import CaseSummaryCard from "@/components/case/CaseSummaryCard";
import FilterPills from "@/components/ui/FilterPills";
import SearchInput from "@/components/ui/SearchInput";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Case = {
    id: string;
    title?: string;
    type?: string;
    updatedAt?: string;
    careGroup?: string | { id: string };
};

const FILTERS = [
    { label: "Tous", value: "tous" },
    { label: "Médical", value: "medical" },
    { label: "Personnel", value: "custom" },
];

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
    medical: { icon: "🩺", color: "bg-sky-100 text-sky-600" },
    custom: { icon: "�", color: "bg-slate-100 text-slate-600" },
};

export default async function CareGroupCasesPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ filter?: string }>;
}) {
    const { id } = await params;
    const { filter } = await searchParams;

    await requireUser();

    // const cases = await payloadREST<{ docs: Case[] }>(
    //     `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    // );

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&where[status][not_equals]=archived&limit=50&depth=0`,
    );

    const [tasksRes, attachmentsRes] = await Promise.all([
        payloadREST<{ docs: { id: string; case?: string | { id: string }; status?: string; urgency?: string; dueDate?: string }[] }>(
            `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=500&depth=0`,
        ),
        payloadREST<{ docs: { id: string; case?: string | { id: string } }[] }>(
            `/api/case-attachments?where[careGroup][equals]=${encodeURIComponent(id)}&limit=500&depth=0`,
        ),
    ]);

    function computeStatus(caseId: string): "urgent" | "action" | "ok" {
        const caseTasks = tasksRes.docs.filter(
            (t) => (typeof t.case === "string" ? t.case : t.case?.id) === caseId
        );
        if (caseTasks.some((t) => t.urgency === "high")) return "urgent";
        if (caseTasks.some((t) => t.status !== "done")) return "action";
        return "ok";
    };

    function computeMeta(caseId: string): string {
        const caseTasks = tasksRes.docs.filter(
            (t) => (typeof t.case === "string" ? t.case : t.case?.id) === caseId
        );
        const pendingCount = caseTasks.filter((t) => t.status !== "done").length;
        const attachCount = attachmentsRes.docs.filter(
            (a) => (typeof a.case === "string" ? a.case : a.case?.id) === caseId
        ).length;
    
        const parts = [];
        if (pendingCount > 0) parts.push(`${pendingCount} tâche${pendingCount > 1 ? "s" : ""} en cours`);
        if (attachCount > 0) parts.push(`${attachCount} document${attachCount > 1 ? "s" : ""}`);
        return parts.length ? parts.join(" · ") : "Aucune activité";
    };

    function formatLastActivity(iso?: string): string {
        if (!iso) return "—";
        const d = new Date(iso);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays === 0) return "aujourd'hui";
        if (diffDays === 1) return "hier";
        if (diffDays < 7) return `il y a ${diffDays} jours`;
        return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(d);
    };

    function nearestDueDate(caseId: string): number {
    const dates = tasksRes.docs
        .filter((t) =>
            (typeof t.case === "string" ? t.case : t.case?.id) === caseId
            && t.status !== "done"
            && t.dueDate
        )
        .map((t) => new Date(t.dueDate!).getTime());
    return dates.length ? Math.min(...dates) : Number.POSITIVE_INFINITY;
    };

    const filtered = (filter && filter !== "tous"
        ? cases.docs.filter((c) => c.type === filter)
        : cases.docs
    ).sort((a, b) => {
        const aDue = nearestDueDate(a.id);
        const bDue = nearestDueDate(b.id);
        if (aDue !== bDue) return aDue - bDue;
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bDate - aDate;
    });

    async function createCase(formData: FormData) {
        "use server";
        const title = String(formData.get("title") ?? "").trim();
        const type = String(formData.get("type") ?? "");
        const careGroup = id;

        if (!title || (type !== "medical" && type !== "custom")) return;

        const user = await requireUser();

        const membership = await payloadREST<{ docs: { role?: string }[] }>(
            `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
        ).then((r) => r.docs[0]);

        if (membership?.role !== "owner" && membership?.role !== "family") return;

        const defaultPatient = await payloadREST<{ docs: { id: string }[] }>(
            `/api/patients?where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
        ).then((r) => r.docs[0]);

        if (!defaultPatient?.id) return;

        await payloadREST("/api/cases", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ careGroup, patient: defaultPatient.id, title, type }),
        });

        const { revalidatePath } = await import("next/cache");
        revalidatePath(`/app/caregroup/${careGroup}/cases`);
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Section 1 — résumé de la page */}
            <PageSummary
                title="Vos dossiers"
                items={[
                    {
                        icon: "📁",
                        label: `${cases.docs.length} dossiers actifs`,
                        className: "font-semibold",
                    },
                    {
                        icon: "🟠",
                        label: `${tasksRes.docs.filter((t) => t.status !== "done").length} actions à effectuer`,
                        className: "text-amber-600",
                    },
                    {
                        icon: "📅",
                        label: `${tasksRes.docs.filter((t) => {
                            if (!t.dueDate) return false;
                            const d = new Date(t.dueDate as string);
                            const weekEnd = new Date();
                            weekEnd.setDate(weekEnd.getDate() + 7);
                            return d <= weekEnd && t.status !== "done";
                        }).length} échéances cette semaine`,
                        className: "text-muted",
                    },
                ]}
                extraAction={<AddDossierPanel careGroupId={id} action={createCase} />}
            />

            {/* Section 2 — Recherche */}
            <SearchInput placeholder="Rechercher un dossier..." />

            {/* Section 3 — Filtres */}
            <FilterPills pills={FILTERS} />

            {/* Section 4 — Liste */}
            <div className="flex flex-col gap-3">
                {filtered.length ? (
                    filtered.map((c) => (
                        <CaseSummaryCard
                            key={c.id}
                            href={`/app/caregroup/${id}/case/${c.id}`}
                            categoryIcon={CATEGORY_CONFIG[c.type ?? ""]?.icon ?? "�"}
                            categoryColor={CATEGORY_CONFIG[c.type ?? ""]?.color ?? "bg-slate-100 text-slate-600"}
                            title={c.title ?? c.id}
                            status={computeStatus(c.id)}
                            meta={computeMeta(c.id)}
                            lastActivity={formatLastActivity(c.updatedAt)}
                        />
                    ))
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
                        Aucun dossier.
                    </div>
                )}
            </div>

        </div>
    );
}
