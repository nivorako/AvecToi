"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type React from "react";

type Item = {
    href: string;
    label: string;
    icon: React.ReactNode;
};

function getCareGroupIdFromPathname(pathname: string | null) {
    if (!pathname) return null;
    const match = pathname.match(/^\/app\/caregroup\/([^/]+)(?:\/|$)/);
    return match?.[1] ?? null;
}

function getCaseIdFromPathname(pathname: string | null) {
    if (!pathname) return null;
    const match = pathname.match(
        /^\/app\/caregroup\/[^/]+\/case\/([^/]+)(?:\/|$)/,
    );
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
                  href: `/app/caregroup/${effectiveCareGroupId}`,
                  label: "Accueil",
                  icon: (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                          <path d="M9 21V12h6v9" />
                      </svg>
                  ),
              },
              {
                  href: `/app/caregroup/${effectiveCareGroupId}/cases`,
                  label: "Dossiers",
                  icon: (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                      </svg>
                  ),
              },
              {
                  href: `/app/caregroup/${effectiveCareGroupId}/messages`,
                  label: "Messages",
                  icon: (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                  ),
              },
              {
                  href: `/app/caregroup/${effectiveCareGroupId}/calendar`,
                  label: "Calendrier",
                  icon: (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                  ),
              },
              {
                  href: `/app/caregroup/${effectiveCareGroupId}/emergency`,
                  label: "Urgences",
                  icon: (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                  ),
              },
          ]
        : [
              { href: "/app", label: "Accueil", icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                      <path d="M9 21V12h6v9" />
                  </svg>
              ) },
              { href: "/app", label: "Dossiers", icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                  </svg>
              ) },
              { href: "/app", label: "Messages", icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
              ) },
              { href: "/app", label: "Calendrier", icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
              ) },
              { href: "/app", label: "Urgences", icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
              ) },
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
                            {item.icon}
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
