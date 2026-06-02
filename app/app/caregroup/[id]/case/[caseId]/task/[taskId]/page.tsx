import { requireUser } from "@/lib/requireUser";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
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
    params: Promise<{ caseId: string; taskId: string }>;
}) {
    const { caseId, taskId } = await params;
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
            {careGroupId ? <CareGroupBanner careGroupId={careGroupId} /> : null}
            <p>Vous êtes dans Dossier {caseTitle}</p>
            <h1> Tâche : {task?.title}</h1>

            <TaskMetadataBar
                taskID={taskId}
                initialUrgency={task?.urgency}
                initialStatus={task?.status as "todo" | "in_progress" | "done"}
                initialSubTasks={task?.subtasks || []}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Informations" />
                    <CardContent>
                        <p>
                            Assigné à:{" "}
                            {typeof task?.assignedTo === "object"
                                ? task.assignedTo.name || task.assignedTo.id
                                : "Non assigné"}
                        </p>
                        <p>{task?.createdAt}</p>
                        <p>date limite</p>
                        <p>Evenement liés (rendez-vous, rappels, etc.)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Description" />
                    <CardContent>
                        <p>description détaillée</p>
                        <p>Bouton modifier description</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader title="Commentaires" />
                    <CardContent>
                        <p>liste des commentaires</p>
                        <p>Auteur + date + contenu</p>
                        <p>+ bouton pour ajouter un commentaire</p>
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
