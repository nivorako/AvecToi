"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Item = {
    label: string;
    href?: string;
    icon: string;
    danger?: boolean;
};

const ITEMS: Item[] = [
    { icon: "👤", label: "Profil",        href: "/app/profile" },
    { icon: "👥", label: "Membres",       href: "/app" },
    { icon: "🏠", label: "Care Group",    href: "/app" },
    { icon: "🕐", label: "Historique",    href: "/app/history" },
    { icon: "🔔", label: "Notifications", href: "/app/notifications" },
    { icon: "⚙️", label: "Paramètres",   href: "/app/settings" },
    { icon: "❓", label: "Aide",          href: "/app/help" },
    { icon: "🚪", label: "Déconnexion",   danger: true },
];

export default function SettingsDrawer() {
    const [open, setOpen] = useState(false);
    const [loadingLogout, setLoadingLogout] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
     async function handleLogout() {
        setLoadingLogout(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } finally {
            setOpen(false);
            router.replace("/");
            setLoadingLogout(false);
        }
    }

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    const portal = mounted ? createPortal(
        <>
            {/* Overlay — bloque tous les clics sous le drawer */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9998,
                    background: "rgba(0,0,0,0.4)",
                    display: open ? "block" : "none",
                }}
                onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    zIndex: 9999,
                    height: "100%",
                    width: "18rem",
                    background: "#ffffff",
                    boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 300ms ease",
                }}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <span className="text-base font-semibold">Menu</span>
                    <button
                        type="button"
                        aria-label="Fermer"
                        onClick={() => setOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-lg"
                    >
                        ✕
                    </button>     
                </div>

                 <nav className="flex flex-col py-2">
                    {ITEMS.map((item) => (
                        item.label === "Déconnexion" ? (
                            <button
                                key={item.label}
                                type="button"
                                onClick={handleLogout}
                                disabled={loadingLogout}
                                className={`flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-border text-left w-full ${
                                    item.danger ? "text-red-500" : "text-muted"
                                }`}
                            >
                                <span className="text-xl w-7 shrink-0">{item.icon}</span>
                                <span className="font-medium">
                                    {loadingLogout ? "..." : item.label}
                                </span>
                            </button>
                        ) : (
                            <Link
                                key={item.label}
                                href={item.href ?? "#"} 
                                onClick={() => setOpen(false)}
                                className={`flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-border ${
                                    item.danger ? "text-red-500" : "text-muted"
                                }`}
                            >
                                <span className="text-xl w-7 shrink-0">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        )
                    ))}
                </nav>

            </div>
        </>,
        document.body,
    ) : null;

    return (
        <>
            {/* Bouton déclencheur */}
            <button
                type="button"
                aria-label="Paramètres"
                onClick={() => setOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            >
                ⚙️
            </button>

            {portal}
        </>
    );
}