import Link from "next/link";

import CaseSummaryCard from "@/components/case/CaseSummaryCard";
import FilterPills from "@/components/ui/FilterPills";
import SearchInput from "@/components/ui/SearchInput";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Case = {
    id: string;
    title?: string;
    type?: string;
    careGroup?: string | { id: string };
};

const FILTERS = [
    { label: "Tous", value: "tous" },
    { label: "Santé", value: "sante" },
    { label: "Banque", value: "banque" },
    { label: "Assurance", value: "assurance" },
    { label: "Administratif", value: "administratif" },
    { label: "Urgent", value: "urgent" },
];

const CATEGORY_ICONS: Record<string, string> = {
    medical: "🏥",
    custom: "📄",
};

export default async function CareGroupDossiersPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ filter?: string }>;
}) {
    const { id } = await params;
    const { filter } = await searchParams;

    await requireUser();

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    );

    const filtered = filter && filter !== "tous"
        ? cases.docs.filter((c) => c.type === filter)
        : cases.docs;

    const newDossierHref = `/app/caregroup/${id}/case/new`;

    return (
        <div className="flex flex-col gap-5">
            {/* Section 1 — Stats */}
            <div className="rounded-2xl bg-primary/10 p-4">
                <h1 className="text-lg font-bold text-primary mb-3">Dossiers</h1>
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                        <span>📁</span>
                        <span>{cases.docs.length} dossiers actifs</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600">
                        <span>🟠</span>
                        <span>3 actions à effectuer</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>📅</span>
                        <span>2 échéances cette semaine</span>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Link
                        href={newDossierHref}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                        + Nouveau dossier
                    </Link>
                </div>
            </div>

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
                            category={c.type ?? "Dossier"}
                            categoryIcon={CATEGORY_ICONS[c.type ?? ""] ?? "📄"}
                            title={c.title ?? c.id}
                            subtitle={c.title}
                            status="action"
                            meta="2 documents"
                            lastActivity="hier"
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