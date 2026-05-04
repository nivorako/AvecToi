import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "./LogoutButton";
import { findCareGroups, getCurrentUser } from "@/lib/payloadRest";

export default async function AppHomePage() {
    // Protected page: requires an authenticated Payload user.
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Fetch the caregroups the user is allowed to see (access control enforced by Payload).
    const caregroups = await findCareGroups();

    return (
        <div className="min-h-screen bg-zinc-50">
            <header className="border-b border-zinc-200 bg-white">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                    <div className="text-sm font-semibold">Avec Toi</div>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-zinc-600">
                            {user.name ?? user.email ?? user.id}
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-4xl px-6 py-8">
                <h1 className="text-2xl font-semibold">Mes caregroups</h1>

                {/* Simple navigation list to the caregroup details pages. */}
                <div className="mt-6 grid grid-cols-1 gap-3">
                    {caregroups.docs.map((cg) => (
                        <Link
                            key={cg.id}
                            href={`/app/caregroups/${cg.id}`}
                            className="rounded-lg border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
                        >
                            <div className="font-medium">
                                {cg.name ?? cg.id}
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
