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
    user?: string;
    careGroup?: string;
};

type Task = {
    id: string;
    title?: string;
    responsable?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
};

async function createTask(formData: FormData) {
    "use server";

    const careGroup = String(formData.get("careGroup") ?? "");
    const caseID = String(formData.get("case") ?? "");
    const title = String(formData.get("title") ?? "");
    const responsable = String(formData.get("responsable") ?? "");
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
                ...(responsable ? { responsable } : {}),
                status: "todo",
                ...(dueDate ? { dueDate } : {}),
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/caregroups/${careGroup}/history`);
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

function statusBadgeVariant(status: string | undefined) {
    if (status === "done") return "primary" as const;
    if (status === "cancelled") return "danger" as const;
    return "muted" as const;
}

function hashToIndex(input: string, modulo: number) {
    let h = 0;
    for (let i = 0; i < input.length; i += 1) {
        h = (h * 31 + input.charCodeAt(i)) >>> 0;
    }
    return h % modulo;
}

function caseAccentClasses(caseId: string) {
    const palette = [
        {
            border: "border-l-sky-300",
            dot: "bg-sky-400",
            dotRing: "ring-sky-200",
        },
        {
            border: "border-l-emerald-300",
            dot: "bg-emerald-400",
            dotRing: "ring-emerald-200",
        },
        {
            border: "border-l-violet-300",
            dot: "bg-violet-400",
            dotRing: "ring-violet-200",
        },
        {
            border: "border-l-amber-300",
            dot: "bg-amber-400",
            dotRing: "ring-amber-200",
        },
        {
            border: "border-l-rose-300",
            dot: "bg-rose-400",
            dotRing: "ring-rose-200",
        },
        {
            border: "border-l-teal-300",
            dot: "bg-teal-400",
            dotRing: "ring-teal-200",
        },
    ] as const;

    return palette[hashToIndex(caseId, palette.length)];
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
    const baseUrl = `/app/caregroups/${encodeURIComponent(id)}/history`;

    const membership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    const casesById = new Map(cases.docs.map((c) => [c.id, c] as const));

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
                                const relatedCase = caseId
                                    ? casesById.get(caseId)
                                    : undefined;
                                const accent = caseId
                                    ? caseAccentClasses(caseId)
                                    : undefined;

                                return (
                                    <div
                                        key={t.id}
                                        className={`rounded-2xl border border-border bg-card px-3 py-2 text-sm ${accent ? `border-l-4 ${accent.border}` : ""}`}
                                    >
                                        <TaskItemRow
                                            taskID={t.id}
                                            title={t.title ?? t.id}
                                            responsable={t.responsable}
                                            dueDateLabel={`${t.status ?? ""}${t.dueDate ? ` • ${formatDateFR(t.dueDate)}` : ""}`}
                                            status={t.status}
                                            badgeVariant={statusBadgeVariant(
                                                t.status,
                                            )}
                                        />
                                        {relatedCase ? (
                                            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                                                <span
                                                    className={`h-2.5 w-2.5 rounded-full ${accent?.dot ?? "bg-muted"} ring-2 ${accent?.dotRing ?? "ring-border"}`}
                                                />
                                                <span className="truncate">
                                                    {relatedCase.title ??
                                                        relatedCase.id}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
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
                                const relatedCase = caseId
                                    ? casesById.get(caseId)
                                    : undefined;
                                const accent = caseId
                                    ? caseAccentClasses(caseId)
                                    : undefined;

                                return (
                                    <div
                                        key={t.id}
                                        className={`rounded-2xl border border-border bg-card px-3 py-2 text-sm ${accent ? `border-l-4 ${accent.border}` : ""}`}
                                    >
                                        <TaskItemRow
                                            taskID={t.id}
                                            title={t.title ?? t.id}
                                            responsable={t.responsable}
                                            dueDateLabel={`${t.status ?? ""}${t.dueDate ? ` • ${formatDateFR(t.dueDate)}` : ""}`}
                                            status={t.status}
                                            badgeVariant={statusBadgeVariant(
                                                t.status,
                                            )}
                                        />
                                        {relatedCase ? (
                                            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                                                <span
                                                    className={`h-2.5 w-2.5 rounded-full ${accent?.dot ?? "bg-muted"} ring-2 ${accent?.dotRing ?? "ring-border"}`}
                                                />
                                                <span className="truncate">
                                                    {relatedCase.title ??
                                                        relatedCase.id}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
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
