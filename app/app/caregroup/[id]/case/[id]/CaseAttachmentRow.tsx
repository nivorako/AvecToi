"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
    attachmentID: string;
    label: string;
    href: string;
    description?: string;
    canManage: boolean;
};

export function CaseAttachmentRow({
    attachmentID,
    label,
    href,
    description,
    canManage,
}: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const normalizedDescription = (description ?? "").trim();
    const isLong = normalizedDescription.length > 90;

    const visibleDescription = !normalizedDescription
        ? ""
        : expanded || !isLong
          ? normalizedDescription
          : `${normalizedDescription.slice(0, 90)}…`;

    return (
        <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 truncate font-medium underline"
                            title={label}
                        >
                            {label}
                        </a>

                        {normalizedDescription ? (
                            <div className="min-w-0 text-xs text-muted">
                                <span className="break-words">
                                    {visibleDescription}
                                </span>
                                {isLong ? (
                                    <button
                                        type="button"
                                        className="ml-2 underline"
                                        onClick={() => setExpanded((v) => !v)}
                                    >
                                        {expanded ? "Voir moins" : "Voir plus"}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>

                {canManage ? (
                    <div className="relative">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setMenuOpen((v) => !v)}
                            disabled={pending}
                        >
                            ...
                        </button>

                        {menuOpen ? (
                            <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-border bg-card p-1 shadow-sm">
                                <button
                                    type="button"
                                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                        const next = window.prompt(
                                            "Nouveau nom (affiché dans la liste)",
                                            label,
                                        );
                                        if (next === null) return;
                                        const trimmed = next.trim();
                                        if (!trimmed) return;

                                        startTransition(async () => {
                                            // Mutations go through Next API routes because a Server Component
                                            // can't pass event handlers to this Client Component.
                                            const res = await fetch(
                                                `/api/case-attachments/${encodeURIComponent(attachmentID)}`,
                                                {
                                                    method: "PATCH",
                                                    headers: {
                                                        "content-type":
                                                            "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        displayName: trimmed,
                                                    }),
                                                },
                                            );

                                            if (!res.ok) {
                                                const text = await res
                                                    .text()
                                                    .catch(() => "");
                                                throw new Error(
                                                    text || "Rename failed",
                                                );
                                            }
                                            // Refresh the server-rendered case page to show the new label.
                                            router.refresh();
                                            setMenuOpen(false);
                                        });
                                    }}
                                    disabled={pending}
                                >
                                    Renommer
                                </button>

                                <button
                                    type="button"
                                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                        const ok = window.confirm(
                                            "Supprimer ce document ?",
                                        );
                                        if (!ok) return;

                                        startTransition(async () => {
                                            // Same as rename: call server-side API route, then refresh the page.
                                            const res = await fetch(
                                                `/api/case-attachments/${encodeURIComponent(attachmentID)}`,
                                                {
                                                    method: "DELETE",
                                                },
                                            );

                                            if (!res.ok) {
                                                const text = await res
                                                    .text()
                                                    .catch(() => "");
                                                throw new Error(
                                                    text || "Delete failed",
                                                );
                                            }

                                            // Refresh to remove the deleted row.
                                            router.refresh();
                                            setMenuOpen(false);
                                        });
                                    }}
                                    disabled={pending}
                                >
                                    Supprimer
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
