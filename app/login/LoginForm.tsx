"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/users/login", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            if (!res.ok) {
                setError("Identifiants invalides");
                return;
            }

            const json = (await res.json()) as { token?: string };
            if (json.token) {
                document.cookie = `avectoi-token=${encodeURIComponent(json.token)}; Path=/; SameSite=Lax`;
            }

            router.replace("/app");
        } catch {
            setError("Erreur de connexion");
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
                <label className="text-sm font-medium" htmlFor="email">
                    Email
                </label>
                <input
                    id="email"
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
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
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    {error}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
                {loading ? "Connexion..." : "Se connecter"}
            </button>
        </form>
    );
}
