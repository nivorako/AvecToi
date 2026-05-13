"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CareGroupBreadcrumbs({
    careGroupId,
    careGroupName,
}: {
    careGroupId: string;
    careGroupName: string;
}) {
    const pathname = usePathname() ?? "";

    const items: Array<{ label: string; href?: string }> = [
        { label: "Groupes", href: "/app" },
        {
            label: careGroupName,
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}`,
        },
    ];

    if (pathname.includes(`/app/caregroups/${careGroupId}/dossiers`)) {
        items.push({
            label: "Dossiers",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/dossiers`,
        });
    } else if (pathname.includes(`/app/caregroups/${careGroupId}/history`)) {
        items.push({
            label: "Historique",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/history`,
        });
    } else if (pathname.includes(`/app/caregroups/${careGroupId}/messages`)) {
        items.push({
            label: "Messages",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/messages`,
        });
    } else if (pathname.includes(`/app/caregroups/${careGroupId}/calendar`)) {
        items.push({
            label: "Calendrier",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/calendar`,
        });
    } else if (pathname.includes(`/app/caregroups/${careGroupId}/members`)) {
        items.push({
            label: "Membres",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/members`,
        });
    }

    if (pathname.startsWith("/app/cases/")) {
        items.push({
            label: "Dossiers",
            href: `/app/caregroups/${encodeURIComponent(careGroupId)}/dossiers`,
        });
        items.push({ label: "Dossier" });
    }

    return (
        <nav aria-label="Fil d'ariane" className="mt-3 text-xs text-muted">
            <ol className="flex flex-wrap items-center gap-1">
                {items.map((it, idx) => (
                    <li key={`${it.label}-${idx}`} className="flex items-center gap-1">
                        {it.href ? (
                            <Link href={it.href} className="underline">
                                {it.label}
                            </Link>
                        ) : (
                            <span>{it.label}</span>
                        )}
                        {idx < items.length - 1 ? <span>/</span> : null}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
