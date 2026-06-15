import Link from "next/link";
import { revalidatePath } from "next/cache";

import FilterPills from "@/components/ui/FilterPills";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Message = {
    id: string;
    content?: string;
    createdAt?: string;
    author?: string | { id: string; name?: string; email?: string };
};

async function createMessage(formData: FormData) {
    "use server";

    const careGroup = String(formData.get("careGroup") ?? "");
    const content = String(formData.get("content") ?? "").trim();

    // Any authenticated caregroup member (including patient) can send messages.
    // The Payload hook sets the author from the logged-in user and validates membership.
    await requireUser();

    if (!careGroup || !content) return;

    try {
        await payloadREST("/api/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                careGroup,
                content,
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/caregroup/${careGroup}/messages`);
}

const MESSAGE_FILTERS = [
    { label: "Toutes", value: "tous" },
    { label: "Non lues", value: "nonlues" },
];


function formatMsgDate(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const today = new Date();
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    const timeLabel = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
    return isToday ? `Aujourd'hui • ${timeLabel}` : `Hier • ${timeLabel}`;
}

export default async function CareGroupMessagesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await requireUser();

    const messages = await payloadREST<{ docs: Message[] }>(
        `/api/messages?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&sort=-createdAt&depth=1`,
    );

    const unreadCount = messages.docs.length;
    const todayCount = messages.docs.filter((m) => {
        if (!m.createdAt) return false;
        const d = new Date(m.createdAt);
        const today = new Date();
        return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
        );
    }).length;

    return (
        <div className="flex flex-col gap-5 pb-20">

            {/* Section 1 — Résumé messages */}
            <div className="rounded-2xl bg-primary/10 p-4">
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                        <span>💬</span>
                        <span>{unreadCount} messages non lus</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>👥</span>
                        <span>Conversations actives</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>📨</span>
                        <span>{todayCount} nouveau{todayCount > 1 ? "x" : ""} aujourd&apos;hui</span>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Link
                        href={`/app/caregroup/${id}/messages`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                        Voir tout
                    </Link>
                </div>
            </div>

            {/* Section 2 — Filtres */}
            <FilterPills pills={MESSAGE_FILTERS} />

            {/* Section 3 — Filtre par dossier (liens statiques) */}
            <div className="flex flex-wrap gap-2">
                {[
                    { label: "Santé", icon: "🏥", value: "sante" },
                    { label: "Banque", icon: "🏦", value: "banque" },
                    { label: "Assurance", icon: "🛡️", value: "assurance" },
                    { label: "Administratif", icon: "📄", value: "administratif" },
                ].map((item) => (
                    <span
                        key={item.value}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ring-border bg-card text-foreground"
                    >
                        {item.icon} {item.label}
                    </span>
                ))}
            </div>

            {/* Section 4 — Conversations */}
            <div className="flex flex-col gap-3">
                {messages.docs.length ? (
                    messages.docs.map((m) => {
                        const author =
                            typeof m.author === "object"
                                ? m.author?.name || m.author?.email || "Inconnu"
                                : m.author ?? "Inconnu";

                        return (
                            <div
                                key={m.id}
                                className="flex items-start justify-between rounded-2xl border border-border bg-card px-4 py-4 gap-3"
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                                        💬
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold">Care Group</div>
                                        <div className="text-sm text-foreground mt-0.5 truncate">
                                            <span className="font-medium">{author} : </span>
                                            {m.content ?? ""}
                                        </div>
                                        <div className="text-xs text-muted mt-1">
                                            {formatMsgDate(m.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted mt-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
                        Aucun message.
                    </div>
                )}
            </div>

            {/* Bouton flottant — Nouvelle conversation */}
            <form action={createMessage} className="fixed bottom-24 right-4 z-30">
                <input type="hidden" name="careGroup" value={id} />
                <input type="hidden" name="content" value="" />
                <Link
                    href={`/app/caregroup/${id}/messages`}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 text-2xl"
                    aria-label="Nouvelle conversation"
                >
                    +
                </Link>
            </form>

        </div>
    );
}
