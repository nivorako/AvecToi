import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";
 
import PageSummary from "@/components/ui/PageSummary";
import { CaseAttachmentRow } from "@/components/case/CaseAttachmentRow";
import { TaskAttachmentRow } from "@/components/task/TaskAttachmentRow";
import AddCaseAttachmentPanel  from "@/components/case/AddCaseAttachmentPanel";
import {CaseAttachmentsUploader} from "@/components/case/CaseAttachmentsUploader";    

type CaseAttachment = {
    id: string;
    filename?: string;
    displayName?: string;
    description?: string;
    url?: string;
    mimeType?: string;
    createdAt?: string;
};

type TaskAttachment = {
    id: string;
    filename?: string;
    displayName?: string;
    description?: string;
    url?: string;
    mimeType?: string;
    task?: string;
    createdAt?: string;
};

type Task = {
    id: string;
    title?: string;
};

type Membership = {
  id: string;
  role?: "owner" | "family" | "professional" | "patient";
};
 
type CaseDoc = {
  id: string;
  type?: string;
  title?: string;
  careGroup?: string | { id: string };
};

export default async function DocumentsPage({
    params,
}: {
    params: Promise<{ id: string; caseId: string }>;
}) {
    const { id, caseId } = await params;
    
    const user = await requireUser();

    // Rôle pour les permissions
    const caseDoc = await payloadREST<CaseDoc>(
        `/api/cases/${encodeURIComponent(caseId)}?depth=0`,
    );
    
    const careGroupID =
        typeof caseDoc?.careGroup === "string"
        ? caseDoc.careGroup
        : caseDoc?.careGroup?.id;
    
    const membership = careGroupID
        ? await payloadREST<{ docs: Membership[] }>(
            `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=1&depth=0`,
        ).then((r) => r.docs[0])
        : undefined;

    const isMedical = caseDoc?.type === "medical";

    const canManage =
        membership?.role === "owner" ||
        membership?.role === "family" ||
        (membership?.role === "professional" && isMedical);

    //  pièces jointes du dossier
    const caseAttachments = await payloadREST<{ docs: CaseAttachment[]}>(
        `/api/case-attachments?where[case][equals]=${encodeURIComponent(caseId)}&limit=50&depth=0`
    );
    
    //  d'abord récupérer les tâches du case, puis les task-attachments
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[case][equals]=${encodeURIComponent(caseId)}&limit=50&depth=0`,
    );

    const taskById = new Map(tasks.docs.map((t) => [t.id, t]));
    const taskIds = tasks.docs.map((t) => t.id).join(",");

    const taskAttachments = taskIds
        ? await payloadREST<{ docs: TaskAttachment[] }>(
            `/api/task-attachments?where[task][in]=${encodeURIComponent(taskIds)}&limit=50&depth=0`,
            )
        : { docs: [] };
    
    return (
        <div className="container mx-auto py-8 flex flex-col justify-between gap-10">
            <PageSummary
                title="Mes documents"
                items={[
                    { icon: "📁", label: "Dossier : " + (caseDoc.title ?? "—") },
                    { icon: "📎", label: caseAttachments.docs.length + " document(s) général" },
                    { icon: "🔗", label: taskAttachments.docs.length + " document(s) lié(s) aux tâches" },
                    { icon: "📌", label: tasks.docs.length + " tâche(s) dans ce dossier" }
                ]}
                action={canManage ? {
                    href: `/app/caregroup/${id}/case/${caseId}/edit`,
                    label: "Modifier le dossier",
                } : undefined}
            />
            {/* <div className="rounded-2xl bg-primary/10 p-4 flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{caseDoc.title ?? "Dossier"}</h1>
            </div> */}

            <div className="flex flex-col gap-6">

                <section>
                    <h2 className="text-base font-bold mb-3">Général</h2>
                    {caseAttachments.docs.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            Aucun document du dossier.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {caseAttachments.docs.map((attachment) => (
                                <CaseAttachmentRow
                                    key={attachment.id}
                                    attachmentID={attachment.id}
                                    label={attachment.displayName || attachment.filename || "Document"}
                                    href={`/api/case-attachments/${encodeURIComponent(attachment.id)}/file`}
                                    description={attachment.description}
                                    canManage={canManage}
                                    mimeType={attachment.mimeType}
                                    createdAt={attachment.createdAt}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-base font-bold mb-3">Liés aux tâches</h2>
                    {taskAttachments.docs.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                            Aucun document lié aux tâches.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {taskAttachments.docs.map((attachment) => (
                                <TaskAttachmentRow
                                    key={attachment.id}
                                    attachmentID={attachment.id}
                                    label={attachment.displayName || attachment.filename || "Document"}
                                    href={`/api/task-attachments/${encodeURIComponent(attachment.id)}/file`}
                                    description={attachment.description}
                                    canManage={canManage}
                                    taskName={
                                        attachment.task
                                            ? taskById.get(attachment.task)?.title
                                            : undefined
                                    }
                                    mimeType={attachment.mimeType}
                                    createdAt={attachment.createdAt}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <AddCaseAttachmentPanel canAdd={canManage}>
                <CaseAttachmentsUploader caseID={caseId} />
            </AddCaseAttachmentPanel>
        </div>
    );
}