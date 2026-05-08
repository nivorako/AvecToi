"use client";

import { useState } from "react";

type Invitation = {
    id: string;
    email?: string;
    role?: "family" | "professional";
    token?: string;
    expiresAt?: string;
};

export function PendingInvitesList({
    invitations,
    onDelete,
}: {
    invitations: Invitation[];
    onDelete: (invitationID: string) => Promise<void>;
}) {
    // Client component because we need browser-only APIs (clipboard) + local UI state.
    const [copiedID, setCopiedID] = useState<string | null>(null);
    const [deletingID, setDeletingID] = useState<string | null>(null);

    async function copy(invite: Invitation) {
        if (!invite.token) return;
        // Use the current origin to generate a clickable invite URL.
        const origin = window.location.origin;
        const url = `${origin}/invite/${invite.token}`;
        await navigator.clipboard.writeText(url);
        setCopiedID(invite.id);
        window.setTimeout(() => setCopiedID(null), 1500);
    }

    if (!invitations.length) {
        return (
            <div className="text-sm text-muted">
                Aucune invitation en attente.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {invitations.map((invite) => {
                const url = invite.token ? `/invite/${invite.token}` : "";

                return (
                    <div
                        key={invite.id}
                        className="rounded-2xl border border-border bg-card px-3 py-2 text-sm"
                    >
                        <div className="font-medium">
                            {invite.email} ({invite.role})
                        </div>
                        <div className="mt-1 break-all text-xs text-muted">
                            {url || "Lien indisponible"}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => copy(invite)}
                                disabled={!invite.token}
                            >
                                {copiedID === invite.id
                                    ? "Copié"
                                    : "Copier le lien"}
                            </button>

                            <button
                                type="button"
                                className="btn-danger"
                                disabled={deletingID === invite.id}
                                onClick={async () => {
                                    // Optimistic UI: disable only the row being deleted.
                                    setDeletingID(invite.id);
                                    try {
                                        await onDelete(invite.id);
                                    } finally {
                                        setDeletingID(null);
                                    }
                                }}
                            >
                                {deletingID === invite.id
                                    ? "Suppression..."
                                    : "Supprimer"}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
