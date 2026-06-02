"use client";

import Link from "next/link";
import { useTransition, useState } from "react";

type Urgency = "low" | "high";

type Props = {
    taskID: string;
    title: string;
    createdAtLabel?: string;
    careGroupId?: string;
    caseId?: string;
    urgency?: Urgency;
};

const urgencyConfig = {
    low: {
        label: "Peut attendre",
        color: "bg-green-500",
        next: "high" as const,
    },
    high: { label: "Très urgent", color: "bg-red-500", next: "low" as const },
};

export default function TaskItemRow({
    taskID,
    title,
    createdAtLabel,
    careGroupId,
    caseId,
    urgency = "low",
}: Props) {
    const [pending, startTransition] = useTransition();
    const [currentUrgency, setCurrentUrgency] = useState<Urgency>(urgency);

    const config = urgencyConfig[currentUrgency] || urgencyConfig.low;

    const cycleUrgency = () => {
        const nextUrgency = config.next;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/tasks/${taskID}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urgency: nextUrgency }),
                });
                if (res.ok) {
                    setCurrentUrgency(nextUrgency);
                }
            } catch (error) {
                console.error("Failed to update urgency:", error);
            }
        });
    };

    // Build the task detail URL based on available context
    const taskHref =
        careGroupId && caseId
            ? `/app/caregroup/${careGroupId}/case/${caseId}/task/${taskID}`
            : `/app/tasks/${taskID}`;

    return (
        <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <div
                            className={`h-3 w-3 rounded-full ${config.color}`}
                            title={config.label}
                        />
                        <div className="font-medium">{title}</div>
                    </div>
                    <div className="text-xs text-muted">
                        {createdAtLabel ?? ""}
                    </div>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                    <button
                        type="button"
                        onClick={cycleUrgency}
                        disabled={pending}
                        className="btn-secondary px-2 py-1.5 leading-none text-xs"
                        title={`Changer urgence: ${config.label}`}
                    >
                        {config.label}
                    </button>
                    <Link
                        href={taskHref}
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
