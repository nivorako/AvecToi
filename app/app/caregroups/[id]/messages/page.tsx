import { requireUser } from "@/lib/requireUser";
import CareGroupBanner from "@/components/caregroup/CareGroupBanner";

export default async function CareGroupMessagesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireUser();

    return (
        <div>
            <CareGroupBanner careGroupId={id} />
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
                À venir.
            </div>
        </div>
    );
}
