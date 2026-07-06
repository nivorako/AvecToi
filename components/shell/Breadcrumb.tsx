"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumb } from "./BreadcrumContext";

const STATIC_LABELS: Record<string, string> = {
    app: "Accueil",
    tasks: "Tâches",
    documents: "Documents",
    notes: "Notes",
    messages: "Messages",
    calendar: "Calendrier",
    informations: "Informations",
    cases: "Dossiers",
    members: "Membres",
    history: "Historique",
    emergency: "Urgence",
};

const HIDDEN_SEGMENTS = new Set(["app", "caregroup"]);

export default function Breadcrumb() {
    const pathname = usePathname();
    const { labels } = useBreadcrumb();
    const segments = pathname.split("/").filter(Boolean);

    const items: { label: string; href: string }[] = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const href = "/" + segments.slice(0, i + 1).join("/");

        if (HIDDEN_SEGMENTS.has(seg)) continue;

        // Masquer les segments dynamiques sans libellé juste avant /edit
        if (segments[i + 1] === "edit" && !labels[seg] && !STATIC_LABELS[seg]) {
            continue;
        }
        
        if (seg === "case") {
            const careGroupId = segments[i - 1];
            if (careGroupId) {
                items.push({
                    label: "Dossiers",
                    href: `/app/caregroup/${careGroupId}/cases`,
                });
            }
            continue;
        }

        if (seg === "task") {
            const careGroupId = segments[i - 3]; // caregroup > {id} > case > {caseId} > task
            const caseId = segments[i - 1];
            if (careGroupId && caseId) {
                items.push({
                    label: "Tâches",
                    href: `/app/caregroup/${careGroupId}/case/${caseId}/tasks`,
                });
            }
            continue;
        }

        const label = labels[seg] ?? STATIC_LABELS[seg] ?? seg;
        items.push({ label, href });
    }

    const isCareGroupHome =
    segments.length === 3 &&
    segments[0] === "app" &&
    segments[1] === "caregroup";
 
    if (isCareGroupHome) {
        items.push({ label: "Accueil", href: pathname });
    }

    if (items.length === 0) return null;

    return (
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-muted flex-wrap">
            {items.map((item, i) => (
                <span key={`${item.href}-${item.label}`} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted/50">›</span>}
                    {i < items.length - 1 ? (
                        <Link href={item.href} className="hover:underline text-muted">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-foreground">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}