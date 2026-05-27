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
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}`,
        },
    ];

    if (pathname.includes(`/app/caregroup/${careGroupId}/dossiers`)) {
        items.push({
            label: "Dossiers",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/dossiers`,
        });
    } else if (pathname.includes(`/app/caregroup/${careGroupId}/tasks`)) {
        items.push({
            label: "Agenda",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/tasks`,
        });
    } else if (pathname.includes(`/app/caregroup/${careGroupId}/messages`)) {
        items.push({
            label: "Messages",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/messages`,
        });
    } else if (pathname.includes(`/app/caregroup/${careGroupId}/calendar`)) {
        items.push({
            label: "Calendrier",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/calendar`,
        });
    } else if (pathname.includes(`/app/caregroup/${careGroupId}/members`)) {
        items.push({
            label: "Membres",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/members`,
        });
    }

    if (pathname.includes(`/app/caregroup/${careGroupId}/case/`)) {
        items.push({
            label: "Dossiers",
            href: `/app/caregroup/${encodeURIComponent(careGroupId)}/dossiers`,
        });
        items.push({ label: "Dossier" });
    }

    return (
        <nav aria-label="Fil d'ariane" className="mt-3 text-xs text-muted">
            <ol className="flex flex-wrap items-center gap-1">
                {items.map((it, idx) => (
                    <li
                        key={`${it.label}-${idx}`}
                        className="flex items-center gap-1"
                    >
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
