"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";

export default function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function logout() {
        // Client-side logout:
        // 1) Ask Payload to clear any session cookies.
        // 2) Clear our HttpOnly JWT cookie.
        // 3) Navigate back to the login page.
        setLoading(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } finally {
            router.replace("/login");
            setLoading(false);
        }
    }

    return (
        <Button
            type="button"
            onClick={logout}
            disabled={loading}
            variant="tertiary"
        >
            {loading ? "..." : "Logout"}
        </Button>
    );
}
