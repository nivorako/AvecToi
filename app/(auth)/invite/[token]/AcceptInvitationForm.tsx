
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AcceptInvitationFormProps = {
    token: string;
    invitedEmail: string;
    careGroupID: string;
};

export default function AcceptInvitationForm({
    token,
    invitedEmail,
    careGroupID,
}: AcceptInvitationFormProps) {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState(invitedEmail);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setError("");
        setSuccess(false);

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            setError("Veuillez renseigner tous les champs.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/accept-invitation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    name: normalizedName,
                    email: normalizedEmail,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                setError(
                    result.message ??
                        "Impossible d'accepter cette invitation.",
                );
                return;
            }

            setSuccess(true);

            // L'acceptation crée le compte, mais l'endpoint actuel
            // ne garantit pas encore une session navigateur ouverte.
            const next = `/app/caregroup/${careGroupID}`;

            router.push(`/login?next=${encodeURIComponent(next)}`);
            router.refresh();
        } catch {
            setError(
                "Une erreur réseau est survenue. Vérifiez votre connexion puis réessayez.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
                <label
                    htmlFor="invite-name"
                    className="mb-1 block text-sm font-medium"
                >
                    Nom complet
                </label>
                <input
                    id="invite-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
            </div>

            <div>
                <label
                    htmlFor="invite-email"
                    className="mb-1 block text-sm font-medium"
                >
                    Adresse e-mail
                </label>
                <input
                    id="invite-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted">
                    Utilisez l&apos;adresse à laquelle l&apos;invitation a été envoyée.
                </p>
            </div>

            <div>
                <label
                    htmlFor="invite-password"
                    className="mb-1 block text-sm font-medium"
                >
                    Mot de passe
                </label>
                <input
                    id="invite-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
            </div>

            {error ? (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            ) : null}

            {success ? (
                <p role="status" className="text-sm">
                    Invitation acceptée. Redirection vers la connexion…
                </p>
            ) : null}

            <button
                type="submit"
                disabled={loading}
                className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? "Acceptation en cours…" : "Créer mon compte et accepter"}
            </button>
        </form>
    );
}
