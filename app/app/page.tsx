import Link from "next/link";

import { requireUser } from "@/lib/requireUser";
import { findCareGroups } from "@/lib/payloadRest";

export default async function AppHomePage() {
    // Server Component (async): the initial dashboard is rendered on the server.
    // This keeps access control + data fetching on the backend and avoids exposing tokens.

    // Protected page: requires an authenticated Payload user.
    await requireUser();

    // Fetch the caregroups the user is allowed to see (access control enforced by Payload).
    const caregroups = await findCareGroups();

    return (
        <div>
            <h1 className="text-2xl font-semibold">Groupe de soins</h1>

            <div className="mt-6 grid grid-cols-1 gap-3">
                {caregroups.docs.map((cg) => (
                    <Link
                        key={cg.id}
                        href={`/app/caregroups/${cg.id}`}
                        className="rounded-2xl border border-border bg-card p-4 hover:bg-card/70"
                    >
                        <div className="font-medium">{cg.name ?? cg.id}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
