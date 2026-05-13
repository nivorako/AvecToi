import { requireUser } from "@/lib/requireUser";

export default async function HistoryPage() {
    await requireUser();

    return (
        <div>
            <h1 className="text-2xl font-semibold">Historique</h1>
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
                À venir.
            </div>
        </div>
    );
}
