"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function logout() {
        setLoading(true);
        try {
            await fetch("/api/users/logout", {
                method: "POST",
                credentials: "include",
            });
        } finally {
            document.cookie = "avectoi-token=; Path=/; Max-Age=0; SameSite=Lax";
            router.replace("/login");
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
        >
            {loading ? "..." : "Logout"}
        </button>
    );
}
