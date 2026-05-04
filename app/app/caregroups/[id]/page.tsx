import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, payloadREST } from "@/lib/payloadRest";

type CareGroup = { id: string; name?: string };

type Patient = {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
};

type Case = { id: string; title?: string; type?: "medical" | "custom" };

type Task = {
    id: string;
    title?: string;
    status?: string;
    dueDate?: string;
    case?: string | { id: string; title?: string };
};

export default async function CareGroupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Route: /app/caregroups/:id
    // Displays a caregroup dashboard (patients, cases, tasks).
    const { id } = await params;

    // Protected page: redirect to login when user is not authenticated.
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Basic caregroup info.
    const careGroup = await payloadREST<CareGroup>(
        `/api/caregroups/${id}?depth=0`,
    );

    // Patients belonging to this caregroup.
    const patients = await payloadREST<{ docs: Patient[] }>(
        `/api/patients?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&depth=0`,
    );

    // Cases and tasks are filtered by Payload access control.
    // The UI can safely show what the API returns for the current user.
    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}&limit=20&depth=0`,
    );

    // Latest tasks for this caregroup.
    const tasks = await payloadREST<{ docs: Task[] }>(
        `/api/tasks?where[careGroup][equals]=${encodeURIComponent(id)}&limit=20&depth=0`,
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
                <h1 className="text-2xl font-semibold">
                    {careGroup?.name ?? careGroup?.id ?? id}
                </h1>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <section className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h2 className="text-base font-semibold">Patients</h2>
                        <div className="mt-4 flex flex-col gap-2">
                            {patients.docs.map((p) => (
                                <div
                                    key={p.id}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                >
                                    {(p.fullName ??
                                        `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()) ||
                                        p.id}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h2 className="text-base font-semibold">
                            Cases (filtrés par rôle)
                        </h2>
                        <div className="mt-4 flex flex-col gap-2">
                            {cases.docs.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/app/cases/${c.id}`}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                                >
                                    <div className="font-medium">
                                        {c.title ?? c.id}
                                    </div>
                                    <div className="text-xs text-zinc-600">
                                        {c.type}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h2 className="text-base font-semibold">
                            Tasks (filtrées par rôle)
                        </h2>
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
                </div>
            </main>
        </div>
    );
}
