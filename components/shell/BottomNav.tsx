"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
    href: string;
    label: string;
};

function getCareGroupIdFromPathname(pathname: string | null) {
    if (!pathname) return null;
    const match = pathname.match(/^\/app\/caregroups\/([^/]+)(?:\/|$)/);
    return match?.[1] ?? null;
}

export default function BottomNav() {
    const pathname = usePathname();

    const careGroupId = getCareGroupIdFromPathname(pathname);
    const isEnabled = Boolean(careGroupId);

    const items: Item[] = careGroupId
        ? [
              { href: `/app/caregroups/${careGroupId}`, label: "Dashboard" },
              {
                  href: `/app/caregroups/${careGroupId}/calendar`,
                  label: "Calendrier",
              },
              {
                  href: `/app/caregroups/${careGroupId}/messages`,
                  label: "Messages",
              },
              {
                  href: `/app/caregroups/${careGroupId}/history`,
                  label: "Historique",
              },
              {
                  href: `/app/caregroups/${careGroupId}/dossiers`,
                  label: "Dossiers",
              },
          ]
        : [
              { href: "/app", label: "Dashboard" },
              { href: "/app", label: "Calendrier" },
              { href: "/app", label: "Messages" },
              { href: "/app", label: "Historique" },
              { href: "/app", label: "Dossiers" },
          ];

    return (
        <nav
            className={
                isEnabled
                    ? "mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2 py-2"
                    : "mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2 py-2 opacity-60 blur-[0.2px]"
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
