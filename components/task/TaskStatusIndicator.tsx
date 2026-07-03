"use client";

import { useTransition } from "react";

export type Status = "todo" | "in_progress" | "done";

type Props = {
    taskID: string;
    status?: Status;
    disabled?: boolean;
    onStatusChange?: (status: Status) => void;
};

const statusConfig: Record<Status, { label: string; icon: string; activeClasses: string }> = {
    todo:        { label: "À faire",  icon: "○", activeClasses: "bg-white shadow text-yellow-700 border-yellow-200" },
    in_progress: { label: "En cours", icon: "◑", activeClasses: "bg-white shadow text-blue-700 border-blue-200"   },
    done:        { label: "Terminée", icon: "●", activeClasses: "bg-white shadow text-green-700 border-green-200" },
};

export default function TaskStatusIndicator({
    taskID,
    status = "todo",
    disabled = false,
    onStatusChange,
}: Props) {
    const [pending, startTransition] = useTransition();

    const updateStatus = (newStatus: Status) => {
        if (newStatus === status) return;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/tasks/${taskID}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                });
                if (res.ok) {
                    onStatusChange?.(newStatus);
                }
            } catch (error) {
                console.error("Failed to update status:", error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Statut</h2>
            <div className="flex gap-1 rounded-xl bg-muted/10 border border-border p-1">
                {(Object.keys(statusConfig) as Status[]).map((key) => {
                    const opt = statusConfig[key];
                    const isActive = status === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => updateStatus(key)}
                            disabled={pending || (disabled && !isActive)}
                            title={disabled && !isActive ? "Statut géré par les sous-tâches" : undefined}
                            className={`
                                flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg
                                border text-sm font-medium transition-all duration-150
                                ${isActive
                                    ? opt.activeClasses
                                    : "border-transparent text-muted hover:text-foreground hover:bg-white/50"}
                                ${disabled && !isActive ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                            `}
                        >
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
