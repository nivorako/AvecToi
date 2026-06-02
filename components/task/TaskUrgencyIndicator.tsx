"use client";

import { useTransition, useState } from "react";

type Urgency = "low" | "high";

type Props = {
    taskID: string;
    initialUrgency?: Urgency;
};

const urgencyConfig = {
    low: {
        label: "Peut attendre",
        color: "bg-green-500",
    },
    high: { label: "Très urgent", color: "bg-red-500" },
};

export default function TaskUrgencyIndicator({
    taskID,
    initialUrgency = "low",
}: Props) {
    const [pending, startTransition] = useTransition();
    const [currentUrgency, setCurrentUrgency] =
        useState<Urgency>(initialUrgency);

    const config = urgencyConfig[currentUrgency] || urgencyConfig.low;

    const [isOpen, setIsOpen] = useState(false);

    const updateUrgency = (newUrgency: Urgency) => {
        setIsOpen(false);
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
        <div className="relative">
            <div className="flex justify-between gap-3 rounded-2xl border border-border bg-card px-6 py-3">
                <div className="flex items-center gap-2">
                    <div
                        className={`h-4 w-4 rounded-full ${config.color}`}
                        title={config.label}
                    />
                    <span className="font-medium">{config.label}</span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={pending}
                    className="btn-secondary px-3 py-1.5 text-sm"
                    title="Changer le niveau d'urgence"
                >
                    Modifier urgence
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-10 rounded-2xl border border-border bg-card shadow-lg p-2 min-w-[200px]">
                    {(Object.keys(urgencyConfig) as Urgency[]).map((key) => {
                        const option = urgencyConfig[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => updateUrgency(key)}
                                disabled={pending}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/70 disabled:opacity-50 text-sm"
                            >
                                <div
                                    className={`h-3 w-3 rounded-full ${option.color}`}
                                />
                                <span>{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
