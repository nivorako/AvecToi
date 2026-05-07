"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterForm({
    nextUrl,
    initialEmail,
}: {
    nextUrl?: string;
    initialEmail?: string;
}) {
    const router = useRouter();
    const [email, setEmail] = useState(initialEmail || "");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    name,
                    password,
                }),
            });

            if (res.status === 409) {
                setError("Email déjà utilisé");
                return;
            }

            if (!res.ok) {
                setError("Erreur d'inscription");
                return;
            }

            router.replace(nextUrl || "/app");
        } catch {
            setError("Erreur d'inscription");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            className="flex w-full max-w-sm flex-col gap-4"
        >
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="name">
                    Nom
                </label>
                <input
                    id="name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ton nom"
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="email">
                    Email
                </label>
                <input
                    id="email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="password">
                    Mot de passe
                </label>
                <input
                    id="password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            {error ? (
                <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-danger">
                    {error}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-60"
            >
                {loading ? "Création..." : "Créer mon compte"}
            </button>

            <div className="text-sm text-muted">
                Déjà un compte ?{" "}
                <Link
                    href={
                        nextUrl
                            ? `/login?next=${encodeURIComponent(nextUrl)}`
                            : "/login"
                    }
                    className="font-medium"
                >
                    Se connecter
                </Link>
            </div>
        </form>
    );
}
