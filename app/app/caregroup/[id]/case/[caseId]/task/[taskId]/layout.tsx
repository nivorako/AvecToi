import type { ReactNode } from "react";

import SetBreadcrumb from "@/components/shell/SetBreadcrumb";
import { payloadREST } from "@/lib/payloadRest";

type TaskDoc = {
    id: string;
    title?: string;
};

export default async function TaskLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string; caseId: string; taskId: string }>;
}) {
    const { taskId } = await params;
    // const task = await payloadREST<TaskDoc>(`/api/tasks/${taskId}?depth=0`);

    const result = await payloadREST<{ docs: TaskDoc[] }>(
        `/api/tasks?where[id][equals]=${encodeURIComponent(taskId)}&limit=1&depth=0`,
    );
    
    const task = result.docs[0];

    return (
        <>
            <SetBreadcrumb labels={{ [taskId]: task?.title ?? taskId }} />
            {children}
        </>
    );
}