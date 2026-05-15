"use client";

import Link from "next/link";
import { useTransition } from "react";

type Props = {
    taskID: string;
    title: string;
    createdAtLabel?: string;
};

export default function TaskItemRow({ taskID, title, createdAtLabel }: Props) {
    const [pending] = useTransition();

    return (
        <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-muted">
                        {createdAtLabel ?? ""}
                    </div>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                    <Link
                        href={`/app/tasks/${encodeURIComponent(taskID)}`}
                        className="btn-secondary px-3 py-1.5 leading-none"
                        onClick={(e) => {
                            if (pending) {
                                e.preventDefault();
                            }
                        }}
                    >
                        Détails
                    </Link>
                </div>
            </div>
        </div>
    );
}
