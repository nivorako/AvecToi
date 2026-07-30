"use client";

import { useState } from "react";

import Button from "@/components/ui/Button/Button";

import { Status } from "./TaskStatusIndicator";

export default function TaskSubtasksManager({
    taskID,
    initialSubTasks,
    onSubTasksChange,
    onStatusChange,
}: {
    taskID: string;
    initialSubTasks: Array<{ id: string; title: string; completed: boolean }>;
    onSubTasksChange?: (
        subTasks: Array<{ id: string; title: string; completed: boolean }>,
    ) => void;
    onStatusChange?: (status: Status) => void;
}) {
    const [subTasks, setSubTasks] = useState(initialSubTasks || []);
    const [isAdding, setIsAdding] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

    const toggleSubtask = async (subtaskId: string) => {
        const updatedSubtasks = subTasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st,
        );
        setSubTasks(updatedSubtasks);
        onSubTasksChange?.(updatedSubtasks);

        // Calculate new status based on updated subtasks
        const newCompletedCount = updatedSubtasks.filter(
            (st) => st.completed,
        ).length;
        const newTotalCount = updatedSubtasks.length;
        let newStatus: Status | undefined;
        if (newTotalCount >= 2) {
            if (newCompletedCount === 0) {
                newStatus = "todo";
            } else if (
                newCompletedCount > 0 &&
                newCompletedCount < newTotalCount
            ) {
                newStatus = "in_progress";
            } else {
                newStatus = "done";
            }
        }
        console.log("newStatus from toggleSubtask", newStatus);
        // Remove client-side id before sending to Payload (Payload manages its own IDs)
        const subtasksForAPI = updatedSubtasks.map(
            ({ id: _id, ...rest }) => rest,
        );

        await fetch(`/api/tasks/${taskID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subtasks: subtasksForAPI,
                ...(newStatus && { status: newStatus }),
            }),
        });

        // Update shared status state in parent
        if (newStatus) {
            onStatusChange?.(newStatus);
        }
    };

    const addSubtask = async () => {
        if (!newSubtaskTitle.trim()) return;

        const newSubtask = {
            id: Date.now().toString(),
            title: newSubtaskTitle,
            completed: false,
        };

        const updatedSubtasks = [...subTasks, newSubtask];
        setSubTasks(updatedSubtasks);
        onSubTasksChange?.(updatedSubtasks);
        setNewSubtaskTitle("");
        setIsAdding(false);

        // Calculate new status based on updated subtasks
        const newCompletedCount = updatedSubtasks.filter(
            (st) => st.completed,
        ).length;
        const newTotalCount = updatedSubtasks.length;
        let newStatus: Status | undefined;
        if (newTotalCount >= 2) {
            if (newCompletedCount === 0) {
                newStatus = "todo";
            } else if (
                newCompletedCount > 0 &&
                newCompletedCount < newTotalCount
            ) {
                newStatus = "in_progress";
            } else {
                newStatus = "done";
            }
        }

        // Remove client-side id before sending to Payload (Payload manages its own IDs)
        const subtasksForAPI = updatedSubtasks.map(
            ({ id: _id, ...rest }) => rest,
        );

        await fetch(`/api/tasks/${taskID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subtasks: subtasksForAPI,
                ...(newStatus && { status: newStatus }),
            }),
        });

        // Update shared status state in parent
        if (newStatus) {
            onStatusChange?.(newStatus);
        }
    };

    const deleteSubtask = async (subtaskId: string) => {
        const updatedSubtasks = subTasks.filter((st) => st.id !== subtaskId);
        setSubTasks(updatedSubtasks);
        onSubTasksChange?.(updatedSubtasks);

        // Calculate new status based on updated subtasks
        const newCompletedCount = updatedSubtasks.filter(
            (st) => st.completed,
        ).length;
        const newTotalCount = updatedSubtasks.length;
        let newStatus: Status | undefined;
        if (newTotalCount >= 2) {
            if (newCompletedCount === 0) {
                newStatus = "todo";
            } else if (
                newCompletedCount > 0 &&
                newCompletedCount < newTotalCount
            ) {
                newStatus = "in_progress";
            } else {
                newStatus = "done";
            }
        }

        // Remove client-side id before sending to Payload (Payload manages its own IDs)
        const subtasksForAPI = updatedSubtasks.map(
            ({ id: _id, ...rest }) => rest,
        );

        await fetch(`/api/tasks/${taskID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subtasks: subtasksForAPI,
                ...(newStatus && { status: newStatus }),
            }),
        });

        // Update shared status state in parent
        if (newStatus) {
            onStatusChange?.(newStatus);
        }
    };

    const completedCount = subTasks.filter((st) => st.completed).length;
    const totalCount = subTasks.length;
    const progress = totalCount > 0 ? `${completedCount}/${totalCount}` : "0/0";

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-3">
            <h2 className="text-lg font-semibold">Sous-tâches</h2>

            {totalCount > 0 && (
                <div className="mb-3 text-sm text-muted-foreground">
                    Progression: {progress} sous-tâches terminées
                </div>
            )}

            {subTasks.length > 0 && (
                <div className="space-y-2 mb-3">
                    {subTasks.map((subTask) => (
                        <div
                            key={subTask.id}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="checkbox"
                                checked={subTask.completed}
                                onChange={() => toggleSubtask(subTask.id)}
                                className="w-4 h-4"
                            />
                            <label
                                className={
                                    subTask.completed
                                        ? "line-through text-muted-foreground"
                                        : ""
                                }
                            >
                                {subTask.title}
                            </label>
                            <button
                                onClick={() => deleteSubtask(subTask.id)}
                                className="text-sm text-danger hover:underline"
                            >
                                Supprimer
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isAdding ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Titre de la sous-tâche"
                        className="flex-1 border rounded px-2 py-1"
                        onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={addSubtask}
                    >
                        Ajouter
                    </Button>
                    <Button
                        type="button"
                        variant="tertiary"
                        size="md"
                        onClick={() => {
                            setIsAdding(false);
                            setNewSubtaskTitle("");
                        }}
                    >
                        Annuler
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => setIsAdding(true)}
                    >
                        + Ajouter une sous-tâche
                    </Button>
                </div>
            )}
        </div>
    );
}
