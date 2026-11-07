"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type Pill = {
    label: string;
    value: string;
};

export default function FilterPills({ pills }: { pills: Pill[] }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const active = searchParams.get("filter") ?? "tous";

    function buildHref(value: string) {
        const params = new URLSearchParams(searchParams.toString());

        if (value === "tous") {
            params.delete("filter");
        } else {
            params.set("filter", value);
        }

        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    const visiblePills = pills.slice(0, 2);
    const otherPills = pills.slice(2);
    const activePill = pills.find((pill) => pill.value === active);
    const activeIsOther = otherPills.some((pill) => pill.value === active);

    // Reference for the details element to close it when clicking outside
    const detailsRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        function handlePointerDown(event: PointerEvent) {
            const details = detailsRef.current;

            if (
                details?.open &&
                !details.contains(event.target as Node)
            ) {
                details.open = false;
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, []);

    return (
        <div className="flex items-center gap-2">
            {visiblePills.map((pill) => {
                const isActive = pill.value === active;

                return (
                    <Link
                        key={pill.value}
                        href={buildHref(pill.value)}
                        className={
                            isActive
                                ? "rounded-full px-4 py-1.5 text-sm font-semibold bg-primary text-white"
                                : "rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-border bg-card text-foreground hover:bg-muted/10"
                        }
                    >
                        {pill.label}
                    </Link>
                );
            })}

            {otherPills.length > 0 && (
                <details ref={detailsRef} className="relative">
                    <summary
                        className={`flex cursor-pointer list-none items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-border ${
                            activeIsOther
                                ? "bg-primary text-white ring-primary"
                                : "bg-card text-foreground hover:bg-muted/10"
                        }`}
                    >
                        {activeIsOther ? activePill?.label : "Autres"}
                        <span aria-hidden="true">⌄</span>
                    </summary>

                    <div className="absolute left-0 top-full z-20 mt-2 flex min-w-44 flex-col overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
                        {otherPills.map((pill) => (
                            <Link
                                key={pill.value}
                                href={buildHref(pill.value)}
                                className={`rounded-lg px-3 py-2 text-sm hover:bg-muted/20 ${
                                    pill.value === active
                                        ? "font-semibold text-primary"
                                        : "text-foreground"
                                }`}
                            >
                                {pill.label}
                            </Link>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
