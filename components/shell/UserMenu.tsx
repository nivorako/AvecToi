"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import IconButton from "@/components/ui/IconButton";

import LogoutButton from "@/app/app/LogoutButton";

function BurgerIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function UserMenu() {
    const params = useParams();
    const [open, setOpen] = useState(false);

    const careGroupId = useMemo(() => {
        const raw = (params as Record<string, unknown> | null)?.id;
        return typeof raw === "string" ? raw : null;
    }, [params]);

    return (
        <div className="relative">
            <IconButton
                type="button"
                variant="ghost"
                size="md"
                icon={<BurgerIcon />}
                aria-label="Menu"
                onClick={() => setOpen((v) => !v)}
            />

            {open ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-border bg-card p-1 shadow-sm">
                    <Link
                        href="/app/profile"
                        className="block w-full rounded-xl px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => setOpen(false)}
                    >
                        Profil
                    </Link>

                    {careGroupId ? (
                        <Link
                            href={`/app/caregroups/${careGroupId}/members`}
                            className="block w-full rounded-xl px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => setOpen(false)}
                        >
                            Membres
                        </Link>
                    ) : null}

                    <div className="px-1 py-1">
                        <LogoutButton />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
