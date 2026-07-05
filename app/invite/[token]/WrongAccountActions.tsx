"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

export function WrongAccountActions({
    nextUrl,
    invitedEmail,
}: {
    nextUrl: string;
    invitedEmail?: string;
}) {
    const [loading, setLoading] = useState(false);

    async function logoutAndContinue() {
        setLoading(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } finally {
            const emailParam = invitedEmail
                ? `&email=${encodeURIComponent(invitedEmail)}`
                : "";
            window.location.href = `/register?next=${encodeURIComponent(nextUrl)}${emailParam}`;
        }
    }

    return (
        <div className="mt-4 flex flex-wrap gap-2">
            <Button
                type="button"
                variant="tertiary"
                size="md"
                onClick={logoutAndContinue}
                disabled={loading}
            >
                {loading ? "Déconnexion..." : "Se déconnecter"}
            </Button>
        </div>
    );
}
