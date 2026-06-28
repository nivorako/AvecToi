"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export default function DotsMenu({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    return (
        <div ref={ref} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Actions"
                aria-expanded={open}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-foreground transition-colors hover:bg-card"
            >
                ⋮
            </button>

            {open ? (
                <div className="absolute right-0 top-full z-10 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <div className="flex flex-col py-1">{children}</div>
                </div>
            ) : null}
        </div>
    );
}

export function DotsMenuItem({
    children,
    onClick,
    className,
    danger,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full px-4 py-2 text-left text-sm transition-colors hover:bg-accent",
                danger ? "text-rose-600 hover:bg-rose-50" : "text-foreground",
                className,
            )}
        >
            {children}
        </button>
    );
}
