import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, payloadREST } from "@/lib/payloadRest";

type CaseDoc = {
    id: string;
    title?: string;
    type?: string;
    description?: string;
    careGroup?: string | { id: string; name?: string };
};

type Task = { id: string; title?: string; status?: string; dueDate?: string };

export default async function CasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/cases/:id
    // Displays a case details page with its tasks.
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await getCurrentUser();
    if (!user) redirect("/login");

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

    return (
        <div className="min-h-screen bg-zinc-50">
            <header className="border-b border-zinc-200 bg-white">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                    <Link href="/app" className="text-sm font-semibold">
                        Avec Toi
                    </Link>
                    <div className="text-sm text-zinc-600">
                        {user.name ?? user.email ?? user.id}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-6 py-8">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {caseDoc?.title ?? caseDoc?.id ?? id}
                        </h1>
                        <div className="mt-1 text-sm text-zinc-600">
                            {caseDoc?.type}
                        </div>
                    </div>

                    {careGroupID ? (
                        <Link
                            href={`/app/caregroups/${careGroupID}`}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                            Retour caregroup
                        </Link>
                    ) : null}
                </div>

                {caseDoc?.description ? (
                    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
                        {caseDoc.description}
                    </div>
                ) : null}

                <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
                    <h2 className="text-base font-semibold">Tasks</h2>
                    <div className="mt-4 flex flex-col gap-2">
                        {tasks.docs.map((t) => (
                            <div
                                key={t.id}
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                            >
                                <div className="font-medium">
                                    {t.title ?? t.id}
                                </div>
                                <div className="text-xs text-zinc-600">
                                    {t.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
