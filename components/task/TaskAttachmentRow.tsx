"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Button from "@/components/ui/Button/Button";

type Props = {
    attachmentID: string;
    label: string;
    href: string;
    description?: string;
    canManage: boolean;
    taskName?: string;
    mimeType?: string;
    createdAt?: string;
    taskHref?: string;
};

function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

function FileIcon({ mimeType }: { mimeType?: string }) {
    let icon = "📎";
    if (mimeType?.startsWith("image/")) icon = "🖼️";
    else if (mimeType === "application/pdf") icon = "📄";
    else if (mimeType?.startsWith("video/")) icon = "🎬";
    else if (mimeType?.startsWith("audio/")) icon = "🎵";
    else if (
        mimeType?.includes("spreadsheet") ||
        mimeType?.includes("excel")
    )
        icon = "📊";
    else if (
        mimeType?.includes("presentation") ||
        mimeType?.includes("powerpoint")
    )
        icon = "📽️";
    return <span className="text-lg shrink-0">{icon}</span>;
}

export function TaskAttachmentRow({
    attachmentID,
    label,
    href,
    description,
    canManage,
    taskName,
    mimeType,
    createdAt,
    taskHref,
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
            <div className="flex items-start gap-3">
                <FileIcon mimeType={mimeType} />

                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:gap-3">
                                <div className="flex flex-row gap-1 items-baseline">
                                    Document : {" "}
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="min-w-0 truncate font-medium !text-primary underline"
                                        title={label}
                                    >
                                        {label}
                                    </a>
                                </div>
                                {normalizedDescription ? (
                                    <div className="min-w-0 text-xs text-muted">
                                        <span className="break-words">
                                            {visibleDescription}
                                        </span>
                                        {isLong ? (
                                            <button
                                                type="button"
                                                className="ml-2 underline"
                                                onClick={() =>
                                                    setExpanded((v) => !v)
                                                }
                                            >
                                                {expanded
                                                    ? "Voir moins"
                                                    : "Voir plus"}
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            {canManage ? (
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="tertiary"
                                        size="md"
                                        className="!text-4xl"
                                        onClick={() => setMenuOpen((v) => !v)}
                                        disabled={pending}
                                    >
                                        ...
                                    </Button>

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
                                                        const res = await fetch(
                                                            `/api/task-attachments/${encodeURIComponent(attachmentID)}`,
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
                                                        const res = await fetch(
                                                            `/api/task-attachments/${encodeURIComponent(attachmentID)}`,
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

                        {taskName ? (
                            <div>
                                Tâche :{" "}
                                {taskHref ? (
                                    <a href={taskHref} className="!text-primary underline">
                                        {taskName}
                                    </a>
                                ) : (
                                    taskName
                                )}
                            </div>
                        ) : null}

                        {createdAt ? (
                            <div className="text-xs text-muted">
                                Ajouté le {formatDateFR(createdAt)}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
