"use client";

import { useState } from "react";
import TaskUrgencyIndicator from "./TaskUrgencyIndicator";
import TaskStatusIndicator, { Status } from "./TaskStatusIndicator";
import TaskSubtasksManager from "./TaskSubtasksManager";

type Props = {
    taskID: string;
    initialUrgency?: "low" | "high";
    initialStatus?: Status;
    initialSubTasks: Array<{ id: string; title: string; completed: boolean }>;
};

export default function TaskMetadataBar({
    taskID,
    initialUrgency,
    initialStatus,
    initialSubTasks,
}: Props) {
    const [subTasks, setSubTasks] = useState(initialSubTasks);
    const [status, setStatus] = useState<Status>(initialStatus || "todo");

    const hasSubTasks = subTasks.length > 0;

    return (
        <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-4">

            {/* Statut — manuel si pas de sous-tâches, lecture seule si sous-tâches */}
            <TaskStatusIndicator
                taskID={taskID}
                status={status}
                disabled={hasSubTasks}
                onStatusChange={setStatus}
            />

            {/* Sous-tâches — gèrent le statut automatiquement quand elles existent */}
            <TaskSubtasksManager
                taskID={taskID}
                initialSubTasks={subTasks}
                onSubTasksChange={setSubTasks}
                onStatusChange={setStatus}
            />

            {/* Séparateur */}
            <div className="border-t border-border" />

            {/* Urgence */}
            <TaskUrgencyIndicator
                taskID={taskID}
                initialUrgency={initialUrgency}
            />
        </div>
    );
}
