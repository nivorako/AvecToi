import Link from "next/link";

import { redirect } from "next/navigation";

import Button from "@/components/ui/Button";

import { getPayload } from "payload";

import config from "@/payload.config";

import { getCurrentUser } from "@/lib/payloadRest";

import { WrongAccountActions } from "./WrongAccountActions";

type Invitation = {
    id: string;
    careGroup?: string;
    email?: string;
    role?: "family" | "professional" | "patient";
    token?: string;
    status?: "pending" | "accepted" | "revoked";
    expiresAt?: string;
};

async function acceptInvite(invite: Invitation) {
    "use server";

    const user = await getCurrentUser();
    if (!user) {
        redirect(
            `/register?next=${encodeURIComponent(`/invite/${invite.token}`)}`,
        );
    }

    if (!invite.email || !user.email) {
        return;
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
        return;
    }

    if (!invite.careGroup || !invite.role) {
        return;
    }

    if (invite.status !== "pending") {
        return;
    }

    if (
        invite.expiresAt &&
        new Date(invite.expiresAt).getTime() < new Date().getTime()
    ) {
        return;
    }

    const payload = await getPayload({ config });

    const existingMembership = await payload.find({
        collection: "memberships",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            and: [
                {
                    user: {
                        equals: user.id,
                    },
                },
                {
                    careGroup: {
                        equals: invite.careGroup,
                    },
                },
            ],
        },
        overrideAccess: true,
    });

    if (existingMembership.docs.length === 0) {
        await payload.create({
            collection: "memberships",
            data: {
                careGroup: invite.careGroup,
                user: user.id,
                role: invite.role,
            },
            overrideAccess: true,
        });
    }

    await payload.update({
        collection: "invitations",
        id: invite.id,
        data: {
            status: "accepted",
        },
        overrideAccess: true,
    });

    redirect(`/app/caregroup/${invite.careGroup}`);
}

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    const payload = await getPayload({ config });

    const invites = await payload.find({
        collection: "invitations",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            token: {
                equals: token,
            },
        },
        overrideAccess: true,
    });

    const invite = invites.docs[0] as Invitation | undefined;

    if (!invite?.id) {
        return (
            <div className="min-h-screen bg-background">
                <main className="mx-auto w-full max-w-2xl px-6 py-12">
                    <h1 className="text-2xl font-semibold">Invitation</h1>
                    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm text-sm text-muted">
                        Invitation introuvable.
                    </div>
                    <div className="mt-6">
                        <Link href="/app" className="btn-tertiary px-4 py-2 text-sm">
                            {"Aller à l'app"}
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const user = await getCurrentUser();
    if (!user) {
        const emailParam = invite.email
            ? `&email=${encodeURIComponent(invite.email)}`
            : "";
        redirect(
            `/register?next=${encodeURIComponent(`/invite/${token}`)}${emailParam}`,
        );
    }

    const wrongUser =
        invite.email && user.email
            ? invite.email.toLowerCase() !== user.email.toLowerCase()
            : true;

    const invalid = invite.status !== "pending" || wrongUser;

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto w-full max-w-2xl px-6 py-12">
                <h1 className="text-2xl font-semibold">Invitation</h1>

                <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="text-sm">
                        <div className="font-medium">Caregroup</div>
                        <div className="mt-1 text-muted">
                            {typeof invite.careGroup === "string"
                                ? invite.careGroup
                                : ""}
                        </div>

                        <div className="mt-4 font-medium">Invité</div>
                        <div className="mt-1 text-muted">{invite.email}</div>

                        <div className="mt-4 font-medium">Rôle</div>
                        <div className="mt-1 text-muted">{invite.role}</div>
                    </div>

                    {invalid ? (
                        <div className="mt-6 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted">
                            {wrongUser
                                ? `Tu es connecté avec ${user.email}. Cette invitation est pour ${invite.email}.`
                                : invite.status !== "pending"
                                  ? "Cette invitation n'est plus valide."
                                  : "Invitation invalide."}

                            {wrongUser ? (
                                <div className="mt-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            className="btn-tertiary px-4 py-2 text-sm"
                                            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                                        >
                                            Se connecter
                                        </Link>
                                        <Link
                                            className="btn-tertiary px-4 py-2 text-sm"
                                            href={`/register?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email || "")}`}
                                        >
                                            Créer un compte
                                        </Link>
                                    </div>

                                    <WrongAccountActions
                                        nextUrl={`/invite/${token}`}
                                        invitedEmail={invite.email}
                                    />
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <form
                            action={acceptInvite.bind(null, invite)}
                            className="mt-6"
                        >
                            <Button type="submit" variant="primary" size="md">
                                {"Accepter l'invitation"}
                            </Button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
