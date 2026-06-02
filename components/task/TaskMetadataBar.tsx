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

    return (
        <>
            <div className="mt-4 mb-6 pb-4 rounded-2xl border border-border bg-card shadow-sm">
                <TaskUrgencyIndicator
                    taskID={taskID}
                    initialUrgency={initialUrgency}
                />
                <TaskStatusIndicator
                    taskID={taskID}
                    status={status}
                    disabled={subTasks.length >= 2}
                />
            </div>

            <TaskSubtasksManager
                taskID={taskID}
                initialSubTasks={subTasks}
                onSubTasksChange={setSubTasks}
                onStatusChange={setStatus}
            />
        </>
    );
}
