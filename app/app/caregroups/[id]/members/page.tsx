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

    // Only owners can revoke invitations for their caregroup.
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

    // Security gate: only owners can invite new members.
    const myMembership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (myMembership?.role !== "owner") {
        return {
            ok: false,
            message: "Seul un owner peut inviter des membres.",
        };
    }

    // If the user already exists and already has a membership, we refuse the invite.
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

    // Avoid sending multiple pending invites to the same email for the same caregroup.
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

    // Access gate:
    // - owner: can manage (invite + revoke + list)
    // - family: can view list
    // - professional: no access (MVP)
    const myMembership = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(id)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (myMembership?.role !== "owner" && myMembership?.role !== "family") {
        return (
            <div>
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold">Membres</h1>
                    <Link
                        href={`/app/caregroups/${id}`}
                        className="btn-secondary"
                    >
                        Retour caregroup
                    </Link>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
                    Tu n’as pas accès à cette page.
                </div>
            </div>
        );
    }

    const memberships = await payloadREST<{ docs: Membership[] }>(
        `/api/memberships?where[careGroup][equals]=${encodeURIComponent(id)}&limit=50&depth=1`,
    );

    const invitations =
        myMembership?.role === "owner"
            ? await payloadREST<{ docs: Invitation[] }>(
                  `/api/invitations?where[careGroup][equals]=${encodeURIComponent(id)}&where[status][equals]=pending&limit=50&depth=0`,
              )
            : { docs: [] as Invitation[] };

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Membres</h1>
                <Link href={`/app/caregroups/${id}`} className="btn-secondary">
                    Retour caregroup
                </Link>
            </div>

            {myMembership?.role === "owner" ? (
                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">
                        Inviter un membre
                    </h2>
                    <InviteMemberForm careGroupID={id} action={inviteMember} />
                </section>
            ) : null}

            {myMembership?.role === "owner" ? (
                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-semibold">
                        Invitations en attente
                    </h2>

                    <div className="mt-4">
                        <PendingInvitesList
                            invitations={invitations.docs}
                            onDelete={async (invitationID: string) => {
                                "use server";
                                // Bridge: UI stays client-side (copy button, loading state)
                                // while the actual delete happens on the server.
                                await deleteInvitation(invitationID, id);
                            }}
                        />
                    </div>
                </section>
            ) : null}

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
        </div>
    );
}
