import { revalidatePath } from "next/cache";

import Link from "next/link";

import AddCaseAttachmentPanel from "@/components/case/AddCaseAttachmentPanel";
import AddCaseTaskPanel from "@/components/case/AddCaseTaskPanel";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import TaskItemRow from "@/components/task/TaskItemRow";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

import { CaseAttachmentsUploader } from "./CaseAttachmentsUploader";
import { CaseAttachmentRow } from "./CaseAttachmentRow";

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional" | "patient";
    user?: string;
    careGroup?: string;
};

type CaseDoc = {
    id: string;
    title?: string;
    type?: string;
    description?: string;
    careGroup?: string | { id: string; name?: string };
};

type Task = {
    id: string;
    title?: string;
    responsable?: string;
    status?: string;
    dueDate?: string;
};

function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

function statusBadgeVariant(status: string | undefined) {
    if (status === "done") return "primary" as const;
    if (status === "cancelled") return "danger" as const;
    return "muted" as const;
}

type CaseAttachment = {
    id: string;
    filename?: string;
    displayName?: string;
    mimeType?: string;
    url?: string;
    description?: string;
};

async function createTask(formData: FormData) {
    "use server";

    // Create Task server action for /app/cases/[id].
    //
    // Permissions (enforced here + by Payload ACL):
    // - owner/family: can create tasks for the case
    // - professional: can create tasks only when the case is medical

    // Read values from the form.
    // Note: everything is treated as untrusted input and re-validated on the server.
    const caseID = String(formData.get("case") ?? "");
    const careGroup = String(formData.get("careGroup") ?? "");
    const caseType = String(formData.get("caseType") ?? "");
    const title = String(formData.get("title") ?? "");
    const responsable = String(formData.get("responsable") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    const user = await requireUser();

    if (!caseID || !careGroup || !title) return;
    if (caseType !== "medical" && caseType !== "custom") return;

    // Determine the caller role inside the caregroup to decide if task creation is allowed.
    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    const canCreate =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && caseType === "medical");

    if (!canCreate) return;

    try {
        await payloadREST("/api/tasks", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                case: caseID,
                title,
                ...(responsable ? { responsable } : {}),
                status: "todo",
                ...(dueDate ? { dueDate } : {}),
            }),
        });
    } catch {
        return;
    }

    // Refresh this case page so the task list updates after the mutation.
    revalidatePath(`/app/cases/${caseID}`);
}

async function updateCaseDescription(formData: FormData) {
    "use server";

    const caseID = String(formData.get("case") ?? "");
    const careGroup = String(formData.get("careGroup") ?? "");
    const description = String(formData.get("description") ?? "");

    const user = await requireUser();

    if (!caseID || !careGroup) return;

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role) return;

    const caseDoc = await payloadREST<CaseDoc>(
        `/api/cases/${encodeURIComponent(caseID)}?depth=0`,
    );

    const normalizedCaseType =
        caseDoc?.type === "medical" || caseDoc?.type === "custom"
            ? caseDoc.type
            : "";

    const canUpdate =
        role === "owner" ||
        role === "family" ||
        (role === "professional" && normalizedCaseType === "medical");

    if (!canUpdate) return;

    try {
        await payloadREST(`/api/cases/${encodeURIComponent(caseID)}`, {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                description,
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/cases/${caseID}`);
}

export default async function CasePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ allTodo?: string; allDone?: string }>;
}) {
    // Route: /app/cases/:id
    // Displays a case details page with its tasks.
    // Tasks, and the create UI below, are filtered by role via Payload access control.
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await requireUser();

    // Case data (depth=1 to populate relationships like careGroup).
    const caseDoc = await payloadREST<CaseDoc>(`/api/cases/${id}?depth=1`);

    // Used to render a "Retour caregroup" link when available.
    const careGroupID =
        typeof caseDoc?.careGroup === "string"
            ? caseDoc.careGroup
            : caseDoc?.careGroup?.id;

    // Tasks belonging to this case.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[case][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    );

    const { allTodo, allDone } = await searchParams;
    const showAllTodo = allTodo === "1";
    const showAllDone = allDone === "1";
    const baseUrl = `/app/cases/${encodeURIComponent(id)}`;

    function buildHref(next: { allTodo?: boolean; allDone?: boolean }) {
        const parts: string[] = [];

        const nextTodo = next.allTodo ?? showAllTodo;
        const nextDone = next.allDone ?? showAllDone;

        if (nextTodo) parts.push("allTodo=1");
        if (nextDone) parts.push("allDone=1");

        return parts.length ? `${baseUrl}?${parts.join("&")}` : baseUrl;
    }

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

    // UI permissions:
    // - patients are read-only on dossiers (no tasks creation, no attachments upload, no notes edits)
    // - we still rely on Payload access control as the real security boundary

    const attachments = await payloadREST<{ docs: CaseAttachment[] }>(
        `/api/case-attachments?where[case][equals]=${encodeURIComponent(id)}&limit=50&depth=0`,
    );

    const upcomingTasks = tasks.docs
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
            const aDue = a.dueDate
                ? new Date(a.dueDate).getTime()
                : Number.POSITIVE_INFINITY;
            const bDue = b.dueDate
                ? new Date(b.dueDate).getTime()
                : Number.POSITIVE_INFINITY;
            if (aDue !== bDue) return aDue - bDue;
            return String(a.title ?? a.id).localeCompare(
                String(b.title ?? b.id),
            );
        });
    const doneTasks = tasks.docs
        .filter((t) => t.status === "done")
        .sort((a, b) => {
            const aDue = a.dueDate
                ? new Date(a.dueDate).getTime()
                : Number.POSITIVE_INFINITY;
            const bDue = b.dueDate
                ? new Date(b.dueDate).getTime()
                : Number.POSITIVE_INFINITY;
            if (aDue !== bDue) return aDue - bDue;
            return String(a.title ?? a.id).localeCompare(
                String(b.title ?? b.id),
            );
        });

    const upcomingShown = showAllTodo
        ? upcomingTasks
        : upcomingTasks.slice(0, 3);
    const doneShown = showAllDone ? doneTasks : doneTasks.slice(0, 3);

    return (
        <div>
            {careGroupID ? <CareGroupBanner careGroupId={careGroupID} /> : null}

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader
                            title="Tâches à faire"
                            action={
                                !showAllTodo && upcomingTasks.length > 3 ? (
                                    <Link
                                        href={buildHref({ allTodo: true })}
                                        className="text-sm font-semibold text-primary"
                                    >
                                        Voir plus
                                    </Link>
                                ) : showAllTodo ? (
                                    <Link
                                        href={buildHref({ allTodo: false })}
                                        className="text-sm font-semibold text-primary"
                                    >
                                        Voir moins
                                    </Link>
                                ) : null
                            }
                        />
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                {upcomingShown.length ? (
                                    upcomingShown.map((t) => (
                                        <TaskItemRow
                                            key={t.id}
                                            taskID={t.id}
                                            title={t.title ?? t.id}
                                            responsable={t.responsable}
                                            dueDateLabel={
                                                t.dueDate
                                                    ? `Échéance: ${formatDateFR(t.dueDate)}`
                                                    : ""
                                            }
                                            status={t.status}
                                            badgeVariant={statusBadgeVariant(
                                                t.status,
                                            )}
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                                        Aucune tâche à faire.
                                    </div>
                                )}
                            </div>

                            {/* Patients will see tasks but not the create panel (read-only). */}
                            {canCreateTask ? (
                                <AddCaseTaskPanel
                                    careGroupId={careGroupID ?? ""}
                                    caseId={id}
                                    caseType={normalizedCaseType}
                                    action={createTask}
                                />
                            ) : (
                                <div className="mt-4 text-sm text-muted">
                                    Tu n’as pas les droits pour ajouter une
                                    task.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Tâches archivées"
                            action={
                                !showAllDone && doneTasks.length > 3 ? (
                                    <Link
                                        href={buildHref({ allDone: true })}
                                        className="text-sm font-semibold text-primary"
                                    >
                                        Voir plus
                                    </Link>
                                ) : showAllDone ? (
                                    <Link
                                        href={buildHref({ allDone: false })}
                                        className="text-sm font-semibold text-primary"
                                    >
                                        Voir moins
                                    </Link>
                                ) : null
                            }
                        />
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                {doneShown.length ? (
                                    doneShown.map((t) => (
                                        <TaskItemRow
                                            key={t.id}
                                            taskID={t.id}
                                            title={t.title ?? t.id}
                                            responsable={t.responsable}
                                            dueDateLabel={
                                                t.dueDate
                                                    ? `Échéance: ${formatDateFR(t.dueDate)}`
                                                    : ""
                                            }
                                            status={t.status}
                                            badgeVariant={statusBadgeVariant(
                                                t.status,
                                            )}
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                                        Aucune tâche archivée.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader title="Mediathéque" />
                    <CardContent>
                        <div className="mt-4 flex flex-col gap-2">
                            {/* Each row is a Client Component to support the inline menu (rename/delete).
                                We trigger mutations through Next API routes because Server Components cannot
                                pass event handlers to Client Components. */}
                            {attachments.docs.length ? (
                                attachments.docs.map((a) => (
                                    <CaseAttachmentRow
                                        key={a.id}
                                        attachmentID={a.id}
                                        href={`/api/case-attachments/${encodeURIComponent(a.id)}/file`}
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
                            <AddCaseAttachmentPanel canAdd={true}>
                                <CaseAttachmentsUploader caseID={id} />
                            </AddCaseAttachmentPanel>
                        ) : (
                            <div className="mt-4 text-sm text-muted">
                                Tu n’as pas les droits pour ajouter des
                                documents.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <CardHeader title="Notes partagées" />
                    <CardContent>
                        {/* Shared notes are editable only for roles allowed to update the case.
                            Patients are read-only. */}
                        {canUpdateCase ? (
                            <form
                                action={updateCaseDescription}
                                className="flex flex-col gap-2"
                            >
                                <input type="hidden" name="case" value={id} />
                                <input
                                    type="hidden"
                                    name="careGroup"
                                    value={careGroupID ?? ""}
                                />
                                <textarea
                                    name="description"
                                    className="input min-h-28"
                                    defaultValue={caseDoc?.description ?? ""}
                                    placeholder="Idées, infos utiles, prochaines étapes..."
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full sm:w-auto"
                                >
                                    Enregistrer
                                </Button>
                            </form>
                        ) : (
                            <div className="text-sm text-muted">
                                Tu n’as pas les droits pour modifier les notes.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
