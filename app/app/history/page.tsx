import { requireUser } from "@/lib/requireUser";

export default async function HistoryPage() {
    await requireUser();

    return (
        <div>
            <h1 className="text-2xl font-semibold">Agenda</h1>
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
                Tâches à faire.
            </div>
        </div>
    );
}
