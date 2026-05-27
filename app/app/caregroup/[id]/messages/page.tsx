import { revalidatePath } from "next/cache";

import CareGroupBanner from "@/components/caregroup/CareGroupBanner";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

type Message = {
    id: string;
    content?: string;
    createdAt?: string;
    author?: string | { id: string; name?: string; email?: string };
};

async function createMessage(formData: FormData) {
    "use server";

    const careGroup = String(formData.get("careGroup") ?? "");
    const content = String(formData.get("content") ?? "").trim();

    // Any authenticated caregroup member (including patient) can send messages.
    // The Payload hook sets the author from the logged-in user and validates membership.
    await requireUser();

    if (!careGroup || !content) return;

    try {
        await payloadREST("/api/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                careGroup,
                content,
            }),
        });
    } catch {
        return;
    }

    revalidatePath(`/app/caregroup/${careGroup}/messages`);
}

export default async function CareGroupMessagesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Messages are caregroup-scoped; Payload ACL filters what the current user can read.
    await requireUser();

    const messages = await payloadREST<{ docs: Message[] }>(
        `/api/messages?where[careGroup][equals]=${encodeURIComponent(id)}&limit=100&sort=-createdAt&depth=1`,
    );

    return (
        <div>
            <CareGroupBanner careGroupId={id} />

            <Card className="mt-6">
                <CardHeader title="Messages" />
                <CardContent>
                    <div className="flex flex-col gap-3">
                        {messages.docs.length ? (
                            messages.docs.map((m) => {
                                const author =
                                    typeof m.author === "string"
                                        ? m.author
                                        : m.author?.name ||
                                          m.author?.email ||
                                          m.author?.id;

                                return (
                                    <div
                                        key={m.id}
                                        className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
                                    >
                                        <div className="text-xs text-muted">
                                            {author || ""}
                                            {m.createdAt
                                                ? ` • ${new Date(m.createdAt).toLocaleString("fr-FR")}`
                                                : ""}
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap">
                                            {m.content ?? ""}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
                                Aucun message.
                            </div>
                        )}
                    </div>

                    <form
                        action={createMessage}
                        className="mt-6 flex flex-col gap-2"
                    >
                        <input type="hidden" name="careGroup" value={id} />
                        <textarea
                            name="content"
                            className="input min-h-24"
                            placeholder="Écrire un message..."
                            required
                        />
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full sm:w-auto"
                        >
                            Envoyer
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
