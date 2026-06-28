import { requireUser } from "@/lib/requireUser";

import TaskDescriptionEditor from "@/components/task/TaskDescriptionEditor";
import { payloadREST } from "@/lib/payloadRest";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TaskAttachmentsUploader } from "@/components/task/TaskAttachmentsUploader";
import AddTaskAttachmentPanel from "@/components/task/AddTaskAttachmentPanel";
import { TaskAttachmentRow } from "@/components/task/TaskAttachmentRow";
import TaskMetadataBar from "@/components/task/TaskMetadataBar";

type CaseDoc = {
    id: string;
    title?: string;
    type?: string;
    description?: string;
    careGroup?: string | { id: string; name?: string };
};

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional" | "patient";
    user?: string | { id: string; name?: string };
    careGroup?: string;
};

type Task = {
    id: string;
    title: string;
    careGroup?: string | { id: string };
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
    case?: string | { id: string; title: string };
    assignedTo?: string | { id: string; name?: string; title: string };
    urgency?: "low" | "high";
    subtasks?: Array<{ id: string; title: string; completed: boolean }>;
};

type TaskAttachment = {
    id: string;
    url: string;
    filename: string;
    displayName?: string;
    description?: string;
    mimeType: string;
    filesize: number;
    createdAt: string;
    updatedAt: string;
};
export default async function TaskPage({
    params,
}: {
    params: Promise<{ id: string; caseId: string; taskId: string }>;
}) {

    const { id, caseId, taskId } = await params;
    const user = await requireUser();
    // Récupérer tasks pour obtenir le careGroupId
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[id][equals]=${encodeURIComponent(taskId)}&limit=1&depth=2&populate=case`,
    );
    const task = tasks.docs[0];

    // Extraire le careGroupId (peut être une string ou un objet avec id)
    const careGroupId =
        typeof task?.careGroup === "string"
            ? task.careGroup
            : task?.careGroup?.id;
    if (!careGroupId) {
        return <div>Task not found or not associated with a caregroup</div>;
    }

    // récupérer les informations de la task
    const caseData = caseId
        ? await payloadREST<{ id: string; title: string }>(
              `/api/cases/${caseId}`,
          )
        : null;
    const caseTitle = caseData?.title || "Unknown case";

    // récupérer task-attachments
    const taskAttachments = await payloadREST<{ docs: TaskAttachment[] }>(
        `/api/task-attachments?where[task][equals]=${encodeURIComponent(taskId)}&limit=50&depth=0`,
    );

    // Case data (depth=1 to populate relationships like careGroup).
    const caseDoc = await payloadREST<CaseDoc>(`/api/cases/${caseId}?depth=1`);

    // Used to render a "Retour caregroup" link when available.
    const careGroupID =
        typeof caseDoc?.careGroup === "string"
            ? caseDoc.careGroup
            : caseDoc?.careGroup?.id;

    // Membership is optional here (case might not have a caregroup populated in edge cases).
    const membership = careGroupID
        ? await payloadREST<{ docs: Membership[] }>(
              `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=1&depth=0`,
          ).then((r) => r.docs[0])
        : undefined;

    const role = membership?.role;
    const normalizedCaseType =
        caseDoc?.type === "medical" || caseDoc?.type === "custom"
            ? caseDoc.type
            : "";
    const canCreateTask =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && normalizedCaseType === "medical");

    const canUpdateCase = canCreateTask;
    return (

        <>

            {/* Résumé de la page */}
            <div className="rounded-2xl bg-primary/10 p-4 flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-primary">Tache : {task.title ?? "Dossier"}</h1>
                </div>
                
                <div className="flex flex-col flex-wrap gap-2 text-sm">

                    {/* Badge statut */}
                    {(() => {
                        const statusConfig = {
                            todo:        { label: "À faire",  classes: "bg-yellow-100 text-yellow-700" },
                            in_progress: { label: "En cours", classes: "bg-blue-100 text-blue-700"    },
                            done:        { label: "Terminée", classes: "bg-green-100 text-green-700"  },
                        };
                        const cfg = statusConfig[task.status as keyof typeof statusConfig] 
                                ?? statusConfig.todo;
                        return (
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 font-medium ${cfg.classes}`}>
                                {cfg.label}
                            </span>
                        );
                    })()}

                    {/* Assigné à */}
                    {task.assignedTo && (
                        <span className="text-muted">
                            Assigné à :{" "}
                            <strong>
                                {typeof task.assignedTo === "object"
                                    ? task.assignedTo.name ?? task.assignedTo.id
                                    : task.assignedTo}
                            </strong>
                        </span>
                    )}

                    {/* Échéance */}
                    {task.dueDate && (() => {
                        const due = new Date(task.dueDate);
                        const isLate = due < new Date() && task.status !== "done";
                        const label = due.toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "long", year: "numeric",
                        });
                        return (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-muted">Échéance : <strong>{label}</strong></span>
                                {isLate && (
                                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                                        En retard
                                    </span>
                                )}
                            </div>
                        );
                    })()}

                </div>

            </div>

            <TaskMetadataBar
                taskID={taskId}
                initialUrgency={task?.urgency}
                initialStatus={task?.status as "todo" | "in_progress" | "done"}
                initialSubTasks={task?.subtasks || []}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                <Card>
                    <CardHeader title="Description" />
                    <CardContent>
                        <TaskDescriptionEditor
                            taskID={taskId}
                            initialDescription={task.description}
                            canEdit={canUpdateCase}
                        />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader title="Mediathéque" />
                    <CardContent>
                        <div className="mt-4 flex flex-col gap-2">
                            {/* Each row is a Client Component to support the inline menu (rename/delete).
                                We trigger mutations through Next API routes because Server Components cannot
                                pass event handlers to Client Components. */}
                            {taskAttachments.docs.length ? (
                                taskAttachments.docs.map((a) => (
                                    <TaskAttachmentRow
                                        key={a.id}
                                        attachmentID={a.id}
                                        href={`/api/task-attachments/${encodeURIComponent(a.id)}/file`}
                                        label={
                                            a.displayName ?? a.filename ?? a.id
                                        }
                                        description={a.description}
                                        canManage={
                                            role === "owner" ||
                                            role === "family"
                                        }
                                    />
                                ))
                            ) : (
                                <div className="text-sm text-muted">
                                    Aucun document.
                                </div>
                            )}
                        </div>

                        {/* Attachments management is restricted to owner/family in the UI.
                                Payload ACL also enforces write permissions server-side.
                                Patients are read-only and cannot add documents. */}
                        {canUpdateCase ? (
                            <AddTaskAttachmentPanel canAdd={true}>
                                <TaskAttachmentsUploader taskID={taskId} />
                            </AddTaskAttachmentPanel>
                        ) : (
                            <div className="mt-4 text-sm text-muted">
                                Tu n’as pas les droits pour ajouter des
                                documents.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
