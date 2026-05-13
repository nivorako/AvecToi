import Link from "next/link";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Case = {
    id: string;
    title?: string;
    type?: string;
    careGroup?: string | { id: string };
};

export default async function CareGroupDossiersPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ type?: string }>;
}) {
    const { id } = await params;
    const { type } = await searchParams;

    await requireUser();

    const whereType =
        type === "medical" || type === "custom"
            ? `&where[type][equals]=${encodeURIComponent(type)}`
            : "";

    const cases = await payloadREST<{ docs: Case[] }>(
        `/api/cases?where[careGroup][equals]=${encodeURIComponent(id)}${whereType}&limit=50&depth=0`,
    );

    const baseUrl = `/app/caregroups/${id}/dossiers`;
    const queryType =
        type === "medical" || type === "custom" ? `type=${type}` : "";

    function buildHref(next: { type?: string }) {
        const nextType = next.type ?? type ?? "";
        const parts: string[] = [];

        if (nextType === "medical" || nextType === "custom") {
            parts.push(`type=${encodeURIComponent(nextType)}`);
        }
        return parts.length ? `${baseUrl}?${parts.join("&")}` : baseUrl;
    }

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dossiers</h1>
                    <div className="mt-1 text-sm text-muted">
                        Liste complète des dossiers
                    </div>
                </div>

                <Link href={`/app/caregroups/${id}`}>
                    <Button variant="secondary">Retour dashboard</Button>
                </Link>
            </div>

            <Card className="mt-6">
                <CardHeader title="Filtres" />
                <CardContent>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={buildHref({ type: "" })}>
                            <Button
                                variant={!queryType ? "primary" : "secondary"}
                            >
                                Tous
                            </Button>
                        </Link>
                        <Link href={buildHref({ type: "medical" })}>
                            <Button
                                variant={
                                    type === "medical" ? "primary" : "secondary"
                                }
                            >
                                Medical
                            </Button>
                        </Link>
                        <Link href={buildHref({ type: "custom" })}>
                            <Button
                                variant={
                                    type === "custom" ? "primary" : "secondary"
                                }
                            >
                                Custom
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader title="Tous les dossiers" />
                <CardContent>
                    <div className="flex flex-col gap-2">
                        {cases.docs.length ? (
                            cases.docs.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/app/cases/${c.id}`}
                                    className="rounded-2xl border border-border bg-card px-3 py-3 text-sm hover:bg-card/70"
                                >
                                    <div className="font-medium">
                                        {c.title ?? c.id}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {c.type}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
                                Aucun dossier.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
