"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Item = {
    href: string;
    label: string;
};

function getCareGroupIdFromPathname(pathname: string | null) {
    if (!pathname) return null;
    const match = pathname.match(/^\/app\/caregroups\/([^/]+)(?:\/|$)/);
    return match?.[1] ?? null;
}

function getCaseIdFromPathname(pathname: string | null) {
    if (!pathname) return null;
    const match = pathname.match(/^\/app\/cases\/([^/]+)(?:\/|$)/);
    return match?.[1] ?? null;
}

export default function BottomNav() {
    const pathname = usePathname();

    const careGroupId = getCareGroupIdFromPathname(pathname);
    const caseId = getCaseIdFromPathname(pathname);
    const [careGroupIdFromCase, setCareGroupIdFromCase] = useState<
        string | null
    >(null);
    const isEnabled = pathname !== "/app";

    const careGroupIdFromStorage = useMemo(() => {
        if (!isEnabled) return null;

        try {
            return window.localStorage.getItem("avectoi:lastCareGroupId");
        } catch {
            return null;
        }
    }, [isEnabled]);

    useEffect(() => {
        if (!careGroupId) return;

        try {
            window.localStorage.setItem("avectoi:lastCareGroupId", careGroupId);
        } catch {
            // ignore
        }
    }, [careGroupId]);

    useEffect(() => {
        if (careGroupId) return;

        if (!caseId) return;

        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(`/api/cases/${caseId}?depth=0`, {
                    signal: controller.signal,
                    credentials: "include",
                });

                if (!res.ok) return;
                const data: { careGroup?: string | { id?: string } } =
                    await res.json();

                const resolved =
                    typeof data?.careGroup === "string"
                        ? data.careGroup
                        : data?.careGroup?.id;

                setCareGroupIdFromCase(resolved ?? null);

                if (resolved) {
                    try {
                        window.localStorage.setItem(
                            "avectoi:lastCareGroupId",
                            resolved,
                        );
                    } catch {
                        // ignore
                    }
                }
            } catch {
                if (!controller.signal.aborted) setCareGroupIdFromCase(null);
            }
        })();

        return () => controller.abort();
    }, [careGroupId, caseId]);

    const effectiveCareGroupId =
        careGroupId ?? careGroupIdFromCase ?? careGroupIdFromStorage;

    const items: Item[] = effectiveCareGroupId
        ? [
              {
                  href: `/app/caregroups/${effectiveCareGroupId}`,
                  label: "Dashboard",
              },
              {
                  href: `/app/caregroups/${effectiveCareGroupId}/dossiers`,
                  label: "Dossiers",
              },
              {
                  href: `/app/caregroups/${effectiveCareGroupId}/history`,
                  label: "Agenda",
              },
              {
                  href: `/app/caregroups/${effectiveCareGroupId}/messages`,
                  label: "Messages",
              },
              {
                  href: `/app/caregroups/${effectiveCareGroupId}/calendar`,
                  label: "Calendrier",
              },
          ]
        : [
              { href: "/app", label: "Dashboard" },
              { href: "/app", label: "Calendrier" },
              { href: "/app", label: "Messages" },
              { href: "/app", label: "Agenda" },
              { href: "/app", label: "Dossiers" },
          ];

    return (
        <nav
            className={
                isEnabled
                    ? "mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2 py-2"
                    : "mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2 py-2 opacity-60"
            }
        >
            {items.map((item) => {
                const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href));

                return (
                    <Link
                        key={item.href + item.label}
                        href={item.href}
                        aria-disabled={!isEnabled}
                        tabIndex={isEnabled ? 0 : -1}
                        className={
                            !isEnabled
                                ? "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs text-muted pointer-events-none"
                                : active
                                  ? "flex flex-col items-center justify-center rounded-2xl bg-primary/10 px-2 py-2 text-xs font-semibold text-primary"
                                  : "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs text-muted hover:bg-card"
                        }
                    >
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
