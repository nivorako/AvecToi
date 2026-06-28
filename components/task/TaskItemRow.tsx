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
    dueDate?: string;
    assignedTo?: string;
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
    dueDate,
    careGroupId,
    caseId,
    urgency = "low",
    assignedTo,
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
        <Link href={taskHref} className="block rounded-2xl border border-border bg-card px-3 py-2 mb-2 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-full flex-1">
                    <div className="flex items-center gap-2">
                        <div
                            className={`h-3 w-3 rounded-full ${config.color}`}
                            title={config.label}
                        />
                        <div className="font-medium">{title}</div>
                    </div>

                    <div className="text-xs text-muted">
                        {dueDate && (() => {
                            const due = new Date(dueDate);
                            const isLate = due < new Date();
                            const label = due.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                            return (
                                <div className="flex items-center justify-between gap-1 text-xs text-muted w-full">
                                    <span>Échéance : {label}</span>
                                    {isLate && (
                                        <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-600">
                                            En retard
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {assignedTo && (
                        <div className="text-xs text-muted">
                            Assigné à : {assignedTo}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
