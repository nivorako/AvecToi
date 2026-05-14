"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import Badge, { type BadgeVariant } from "@/components/ui/Badge";

type Props = {
    taskID: string;
    title: string;
    dueDateLabel?: string;
    status?: string;
    responsable?: string;
    badgeVariant: BadgeVariant;
};

export default function TaskItemRow({
    taskID,
    title,
    dueDateLabel,
    status,
    responsable,
    badgeVariant,
}: Props) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [responsableOpen, setResponsableOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const isDone = status === "done";

    return (
        <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-muted">
                        {dueDateLabel ?? ""}
                    </div>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                    {isDone ? (
                        <Badge variant={badgeVariant} className="shrink-0">
                            {status ?? ""}
                        </Badge>
                    ) : (
                        <div className="flex flex-col items-end gap-1">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setResponsableOpen((v) => !v)}
                            >
                                Responsable
                            </button>
                            {responsableOpen ? (
                                <div className="max-w-[12rem] text-right text-xs text-muted">
                                    {(responsable ?? "").trim() ||
                                        "Non renseigné"}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {!isDone ? (
                        <div className="relative">
                            <button
                                type="button"
                                className="btn-secondary flex h-9 w-9 items-center justify-center p-0 text-xl font-semibold leading-none"
                                onClick={() => setMenuOpen((v) => !v)}
                                disabled={pending}
                                aria-label="Actions"
                            >
                                +
                            </button>

                            {menuOpen ? (
                                <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border border-border bg-card p-1 shadow-sm">
                                    <button
                                        type="button"
                                        className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                                        onClick={() => {
                                            startTransition(async () => {
                                                const res = await fetch(
                                                    `/api/tasks/${encodeURIComponent(taskID)}`,
                                                    {
                                                        method: "PATCH",
                                                        headers: {
                                                            "content-type":
                                                                "application/json",
                                                        },
                                                        body: JSON.stringify({
                                                            status: "done",
                                                        }),
                                                    },
                                                );

                                                if (!res.ok) {
                                                    const text = await res
                                                        .text()
                                                        .catch(() => "");
                                                    throw new Error(
                                                        text ||
                                                            "Update task failed",
                                                    );
                                                }

                                                router.refresh();
                                                setMenuOpen(false);
                                            });
                                        }}
                                        disabled={pending}
                                    >
                                        Terminer
                                    </button>

                                    <button
                                        type="button"
                                        className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                                        onClick={() => {
                                            const ok = window.confirm(
                                                "Supprimer cette tâche ?",
                                            );
                                            if (!ok) return;

                                            startTransition(async () => {
                                                const res = await fetch(
                                                    `/api/tasks/${encodeURIComponent(taskID)}`,
                                                    {
                                                        method: "DELETE",
                                                    },
                                                );

                                                if (!res.ok) {
                                                    const text = await res
                                                        .text()
                                                        .catch(() => "");
                                                    throw new Error(
                                                        text ||
                                                            "Delete task failed",
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
            </div>
        </div>
    );
}
