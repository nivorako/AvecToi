import { revalidatePath } from "next/cache";

import Link from "next/link";

import AddTaskPanel from "@/components/caregroup/AddTaskPanel";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import TaskItemRow from "@/components/task/TaskItemRow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

import { payloadREST } from "@/lib/payloadRest";
import { requireUser } from "@/lib/requireUser";

type Case = { id: string; title?: string };

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional" | "patient";
    user?: string | { id: string; name?: string };
    careGroup?: string;
};

type Task = {
    id: string;
    title?: string;
    createdAt?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
    urgency?: "low" | "high";
};

async function createTask(formData: FormData) {
    "use server";

    const careGroup = String(formData.get("careGroup") ?? "");
    const caseID = String(formData.get("case") ?? "");
    const title = String(formData.get("title") ?? "");
    const assignedTo = String(formData.get("assignedTo") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    const user = await requireUser();

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role) return;
    if (!caseID || !title) return;

    const canCreate =
        role === "owner" || role === "family" || role === "professional";
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
                status: "todo",
                ...(assignedTo ? { assignedTo } : {}),
                ...(dueDate ? { dueDate } : {}),
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/caregroup/${careGroup}/tasks`);
}

function formatDateFR(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

export default async function CareGroupHistoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ all?: string }>;
}) {
    const { id } = await params;
    const { all } = await searchParams;
    const user = await requireUser();

    const showAll = all === "1";
    const baseUrl = `/app/caregroup/${encodeURIComponent(id)}/tasks`;

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const careGroupMembers = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=1`,
    );
    const users = careGroupMembers.docs
        .map((m) => m.user)
        .filter(
            (u): u is { id: string; name?: string } =>
                u !== null && typeof u === "object",
        );

    const done = tasks.docs.filter((t) => t.status === "done");
    const upcoming = tasks.docs.filter((t) => t.status !== "done");

    const upcomingSorted = [...upcoming].sort((a, b) => {
        const aDue = a.dueDate
            ? new Date(a.dueDate).getTime()
            : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate
            ? new Date(b.dueDate).getTime()
            : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        return String(a.title ?? a.id).localeCompare(String(b.title ?? b.id));
    });

    const doneSorted = [...done].sort((a, b) => {
        const aDue = a.dueDate
            ? new Date(a.dueDate).getTime()
            : Number.NEGATIVE_INFINITY;
        const bDue = b.dueDate
            ? new Date(b.dueDate).getTime()
            : Number.NEGATIVE_INFINITY;
        if (aDue !== bDue) return bDue - aDue;
        return String(a.title ?? a.id).localeCompare(String(b.title ?? b.id));
    });

    const upcomingShown = showAll ? upcomingSorted : upcomingSorted.slice(0, 3);
    const doneShown = showAll ? doneSorted : doneSorted.slice(0, 3);

    return (
        <div>
            <CareGroupBanner careGroupId={id} />

            <Card className="mt-6">
                <CardHeader
                    title="Tâches à faire"
                    action={
                        !showAll && upcomingSorted.length > 3 ? (
                            <Link
                                href={`${baseUrl}?all=1`}
                                className="text-sm font-semibold text-primary"
                            >
                                Voir plus
                            </Link>
                        ) : showAll ? (
                            <Link
                                href={baseUrl}
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
                            upcomingShown.map((t) => {
                                const caseId =
                                    typeof t.case === "string"
                                        ? t.case
                                        : t.case?.id;
                                return (
                                    <TaskItemRow
                                        key={t.id}
                                        taskID={t.id}
                                        title={t.title ?? t.id}
                                        createdAtLabel={
                                            t.createdAt
                                                ? formatDateFR(t.createdAt)
                                                : ""
                                        }
                                        careGroupId={id}
                                        caseId={caseId}
                                        urgency={t.urgency}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-sm text-muted">
                                Aucune tâche.
                            </div>
                        )}
                    </div>

                    {membership?.role &&
                    ["owner", "family", "professional"].includes(
                        membership.role,
                    ) ? (
                        <AddTaskPanel
                            careGroupId={id}
                            defaultCaseId={cases.docs[0]?.id ?? ""}
                            cases={cases.docs}
                            action={createTask}
                            users={users}
                        />
                    ) : null}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader
                    title="Tâches archivées"
                    action={
                        !showAll && doneSorted.length > 3 ? (
                            <Link
                                href={`${baseUrl}?all=1`}
                                className="text-sm font-semibold text-primary"
                            >
                                Voir plus
                            </Link>
                        ) : showAll ? (
                            <Link
                                href={baseUrl}
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
                            doneShown.map((t) => {
                                const caseId =
                                    typeof t.case === "string"
                                        ? t.case
                                        : t.case?.id;
                                return (
                                    <TaskItemRow
                                        key={t.id}
                                        taskID={t.id}
                                        title={t.title ?? t.id}
                                        createdAtLabel={
                                            t.createdAt
                                                ? formatDateFR(t.createdAt)
                                                : ""
                                        }
                                        careGroupId={id}
                                        caseId={caseId}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-sm text-muted">
                                Aucune tâche.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
