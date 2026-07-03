"use client";

import { useTransition, useState } from "react";

type Urgency = "low" | "high";

type Props = {
    taskID: string;
    initialUrgency?: Urgency;
};

const urgencyConfig: Record<Urgency, { label: string; activeClasses: string; dotColor: string }> = {
    low:  { label: "Peut attendre", activeClasses: "bg-green-100 text-green-700 border-green-300",  dotColor: "bg-green-500" },
    high: { label: "Très urgent",   activeClasses: "bg-red-100 text-red-700 border-red-300",        dotColor: "bg-red-500"   },
};

export default function TaskUrgencyIndicator({
    taskID,
    initialUrgency = "low",
}: Props) {
    const [pending, startTransition] = useTransition();
    const [currentUrgency, setCurrentUrgency] = useState<Urgency>(initialUrgency);

    const updateUrgency = (newUrgency: Urgency) => {
        if (newUrgency === currentUrgency) return;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/tasks/${taskID}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urgency: newUrgency }),
                });
                if (res.ok) {
                    setCurrentUrgency(newUrgency);
                }
            } catch (error) {
                console.error("Failed to update urgency:", error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Urgence</h2>
            <div className="flex gap-2">
                {(Object.keys(urgencyConfig) as Urgency[]).map((key) => {
                    const opt = urgencyConfig[key];
                    const isActive = currentUrgency === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => updateUrgency(key)}
                            disabled={pending}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium
                                transition-all duration-150 disabled:opacity-50
                                ${isActive
                                    ? opt.activeClasses
                                    : "border-border text-muted bg-transparent hover:bg-muted/10"}
                            `}
                        >
                            <span className={`h-2 w-2 rounded-full ${isActive ? opt.dotColor : "bg-muted/40"}`} />
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
