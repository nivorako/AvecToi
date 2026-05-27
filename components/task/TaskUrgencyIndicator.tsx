"use client";

import { useTransition, useState } from "react";

type Urgency = "low" | "medium" | "high";

type Props = {
    taskID: string;
    initialUrgency?: Urgency;
};

const urgencyConfig = {
    low: { label: "Peut attendre", color: "bg-green-500", next: "medium" as const },
    medium: { label: "Moyen", color: "bg-orange-500", next: "high" as const },
    high: { label: "Très urgent", color: "bg-red-500", next: "low" as const },
};

export default function TaskUrgencyIndicator({
    taskID,
    initialUrgency = "low",
}: Props) {
    const [pending, startTransition] = useTransition();
    const [currentUrgency, setCurrentUrgency] = useState<Urgency>(initialUrgency);

    const config = urgencyConfig[currentUrgency];

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

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <div
                className={`h-4 w-4 rounded-full ${config.color}`}
                title={config.label}
            />
            <span className="font-medium">{config.label}</span>
            <button
                type="button"
                onClick={cycleUrgency}
                disabled={pending}
                className="btn-secondary px-3 py-1.5 text-sm"
                title="Changer le niveau d'urgence"
            >
                Changer
            </button>
        </div>
    );
}
