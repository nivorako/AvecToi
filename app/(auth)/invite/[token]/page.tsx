import Link from "next/link";

import type { InvitableRole } from "@/domain/roles";

import { getPayload } from "payload";

import config from "@/payload.config";

import { getCurrentUser } from "@/lib/payloadRest";

import { WrongAccountActions } from "./WrongAccountActions";

import AcceptInvitationForm from "./AcceptInvitationForm";

type Invitation = {
    id: string;
    careGroup?: string;
    email?: string;
    role?: InvitableRole;
    token?: string;
    status?: "pending" | "accepted" | "revoked";
    expiresAt?: string;
};

function getCurrentTimestamp() {
    return Date.now();
}

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {

    const currentTimestamp = getCurrentTimestamp();

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
            <div className="w-full bg-background">
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
    
    const wrongUser = Boolean(
        user &&
            invite.email &&
            (!user.email ||
                invite.email.toLowerCase() !== user.email.toLowerCase()),
    );

    const expired =
        !invite.expiresAt ||
        new Date(invite.expiresAt).getTime() <= currentTimestamp;

    const invalid =
        invite.status !== "pending" || expired || wrongUser;

    const careGroupID =
        typeof invite.careGroup === "string" ||
        typeof invite.careGroup === "number"
            ? String(invite.careGroup)
            : "";

    return (
        <div className="w-full bg-background">
            <main className="mx-auto w-full max-w-2xl px-6 py-6">
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
                            {/* {wrongUser
                                ? `Tu es connecté avec ${user.email}. Cette invitation est pour ${invite.email}.`
                                : invite.status !== "pending"
                                  ? "Cette invitation n'est plus valide."
                                  : "Invitation invalide."} */}

                            {wrongUser
                                ? `Tu es connecté avec ${user?.email}. Cette invitation est pour ${invite.email}.`
                                : invite.status !== "pending"
                                ? "Cette invitation n'est plus en attente."
                                : expired
                                    ? "Cette invitation a expiré."
                                    : "Cette invitation est invalide."}

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
                    ) :  careGroupID ? (
                                <AcceptInvitationForm
                                    token={token}
                                    invitedEmail={invite.email ?? ""}
                                    careGroupID={careGroupID}
                                />
                            ) : (
                                <p role="alert" className="mt-6 text-sm text-red-600">
                                    Cette invitation n&apos;est associée à aucun CareGroup valide.
                                </p>  
                    )} 
                </div>
            </main>
        </div>
    ); 
}
