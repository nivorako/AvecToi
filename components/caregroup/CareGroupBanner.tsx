import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type CareGroup = { id: string; name?: string };

export default async function CareGroupBanner({
    careGroupId,
}: {
    careGroupId: string;
}) {
    const user = await requireUser();
    const careGroup = await payloadREST<CareGroup>(
        `/api/caregroups/${encodeURIComponent(careGroupId)}?depth=0`,
    );

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-base font-semibold">
                Bonjour, {user.name ?? user.email ?? user.id}
            </div>
            <div className="mt-1 text-sm text-muted">
                Bienvenue dans le groupe de soins {careGroup?.name ?? careGroupId}
            </div>
        </div>
    );
}
