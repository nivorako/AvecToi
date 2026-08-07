"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button/Button";

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
    const [showPassword, setShowPassword] = useState(false);
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
                <div className="relative">
                    <input
                        id="password"
                        className="input w-full pr-10"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                        aria-label={
                            showPassword
                                ? "Masquer le mot de passe"
                                : "Afficher le mot de passe"
                        }
                    >
                        {showPassword ? (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <path d="M10.733 5.076A10.744 10.744 0 0 1 12 5c6.5 0 10 7 10 7a18.627 18.627 0 0 1-3.304 4.425" />
                                <path d="M6.61 6.61A18.627 18.627 0 0 0 2 12s3.5 7 10 7c1.163 0 2.263-.224 3.29-.625" />
                                <path d="M8.12 8.12A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                                <path d="M3 3l18 18" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-danger">
                    {error}
                </div>
            ) : null}

            <Button type="submit" variant="primary" size="md" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
            </Button>

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
