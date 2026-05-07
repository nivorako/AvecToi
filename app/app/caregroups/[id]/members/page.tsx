import Link from "next/link";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

import { InviteMemberForm } from "./InviteMemberForm";
import { PendingInvitesList } from "./PendingInvitesList";

type Membership = {
    id: string;
    role?: "owner" | "family" | "professional";
    user?: string | { id: string; email?: string; name?: string };
    careGroup?: string;
};

type UserDoc = { id: string; email?: string; name?: string };

type Invitation = {
    id: string;
    careGroup?: string;
    email?: string;
    role?: "family" | "professional";
    token?: string;
    status?: "pending" | "accepted" | "revoked";
    expiresAt?: string;
};

type InviteState =
    | {
          ok: true;
          message: string;
      }
    | {
          ok: false;
          message: string;
      }
    | null;

async function deleteInvitation(invitationID: string, careGroupID: string) {
    "use server";

    const user = await requireUser();

    if (!invitationID) return;

    const myMembership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupID)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (myMembership?.role !== "owner") {
        return;
    }

    await payloadREST(`/api/invitations/${invitationID}`, {
        method: "DELETE",
    });

    revalidatePath(`/app/caregroups/${careGroupID}/members`);
}

async function inviteMember(prevState: InviteState, formData: FormData) {
    "use server";

    const careGroup = String(formData.get("careGroup") ?? "");
    const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
    const role = String(formData.get("role") ?? "");

    const user = await requireUser();

    if (!careGroup) return { ok: false, message: "Caregroup invalide." };
    if (!email) return { ok: false, message: "Email requis." };
    if (role !== "family" && role !== "professional") {
        return { ok: false, message: "Rôle invalide." };
    }

    const myMembership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (myMembership?.role !== "owner") {
        return {
            ok: false,
            message: "Seul un owner peut inviter des membres.",
        };
    }

    const users = await payloadREST<{ docs: UserDoc[] }>(
        `/api/users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=0`,
    );

    const existingUser = users.docs[0];
    if (existingUser?.id) {
        const existingMembership = await payloadREST<{ docs: Membership[] }>(
            `/api/memberships?where[user][equals]=${encodeURIComponent(existingUser.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
        );

        if (existingMembership.docs.length > 0) {
            return { ok: false, message: "Cet utilisateur est déjà membre." };
        }
    }

    const existingInvite = await payloadREST<{ docs: Invitation[] }>(
        `/api/invitations?where[careGroup][equals]=${encodeURIComponent(careGroup)}&where[email][equals]=${encodeURIComponent(email)}&where[status][equals]=pending&limit=1&depth=0`,
    );

    if (existingInvite.docs.length > 0) {
        return { ok: false, message: "Invitation déjà envoyée." };
    }

    const token = randomUUID();

    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
        await payloadREST("/api/invitations", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                careGroup,
                role,
                email,
                token,
                status: "pending",
                expiresAt,
            }),
        });
    } catch {
        return { ok: false, message: "Erreur lors de l'invitation." };
    }

    revalidatePath(`/app/caregroups/${careGroup}/members`);
    return { ok: true, message: "Invitation créée." };
}

export default async function CareGroupMembersPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const user = await requireUser();

    const myMembership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (myMembership?.role !== "owner") {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border bg-card">
                    <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                        <Link
                            href={`/app/caregroups/${id}`}
                            className="text-sm font-semibold"
                        >
                            Retour caregroup
                        </Link>
                        <div className="text-sm text-muted">
                            {user.name ?? user.email ?? user.id}
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-5xl px-6 py-8">
                    <h1 className="text-2xl font-semibold">Membres</h1>
                    <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm text-sm text-muted">
                        Seul un owner peut gérer les membres.
                    </div>
                </main>
            </div>
        );
    }

    const memberships = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=1`,
    );

    const invitations = await payloadREST<{ docs: Invitation[] }>(
        `/api/invitations?where[careGroup][equals]=${encodeURIComponent(id)}&where[status][equals]=pending&limit=50&depth=0`,
    );

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                    <Link
                        href={`/app/caregroups/${id}`}
                        className="text-sm font-semibold"
                    >
                        Retour caregroup
                    </Link>
                    <div className="text-sm text-muted">
                        {user.name ?? user.email ?? user.id}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-6 py-8">
                <h1 className="text-2xl font-semibold">Membres</h1>

                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">
                        Inviter un membre
                    </h2>
                    <InviteMemberForm careGroupID={id} action={inviteMember} />
                </section>

                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">
                        Invitations en attente
                    </h2>

                    <div className="mt-4">
                        <PendingInvitesList
                            invitations={invitations.docs}
                            onDelete={async (invitationID: string) => {
                                "use server";
                                await deleteInvitation(invitationID, id);
                            }}
                        />
                    </div>
                </section>

                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">Membres actuels</h2>

                    <div className="mt-4 flex flex-col gap-2">
                        {memberships.docs.map((m) => {
                            const userDoc =
                                typeof m.user === "string" ? null : m.user;
                            const label =
                                userDoc?.name ??
                                userDoc?.email ??
                                (typeof m.user === "string" ? m.user : m.id);

                            return (
                                <div
                                    key={m.id}
                                    className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
                                >
                                    <div className="font-medium">{label}</div>
                                    <div className="text-xs text-muted">
                                        {m.role}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
}
