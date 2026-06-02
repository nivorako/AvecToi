"use client";

import { useTransition } from "react";

export type Status = "todo" | "in_progress" | "done";

type Props = {
    taskID: string;
    status?: Status;
    disabled?: boolean;
};

const statusConfig = {
    todo: {
        label: "A faire",
        color: "bg-green-500",
    },
    in_progress: {
        label: "En cours",
        color: "bg-yellow-500",
    },
    done: {
        label: "Terminé",
        color: "bg-blue-500",
    },
};

export default function TaskStateIndicator({
    taskID,
    status = "todo",
    disabled = false,
}: Props) {
    const [pending, startTransition] = useTransition();

    const updateStatus = (newStatus: Status) => {
        //setIsOpen(false);
        startTransition(async () => {
            try {
                const res = await fetch(`/api/tasks/${taskID}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                });
                if (res.ok) {
                    // Status is controlled by parent, no need to update local state
                }
            } catch (error) {
                console.error("Failed to update state:", error);
            }
        });
    };
    console.log("status from TaskStatusIndicator", status);
    return (
        <div className="flex flex-row justify-around mt-8">
            {Object.keys(statusConfig).map((key) => {
                const option = statusConfig[key as Status];
                const isActive = status === key;
                return (
                    <button
                        key={key}
                        onClick={() => updateStatus(key as Status)}
                        disabled={pending || (disabled && !isActive)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white
                            transition-all duration-200  ${option.color}
                            ${
                                isActive
                                    ? "brightness-110 shadow-lg scale-105"
                                    : "brightness-75 hover:brightness-90"
                            }
                            ${disabled && !isActive ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
