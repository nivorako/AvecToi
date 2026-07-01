"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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

    return (
        <div className="flex flex-wrap justify-around gap-2 w-full">
            {pills.map((pill) => {
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
        </div>
    );
}