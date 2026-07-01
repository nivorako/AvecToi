import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

type SummaryItem = {
    icon: string;
    label: ReactNode;
    className?: string;
};

type PageSummaryProps = {
    title?: ReactNode;
    items: SummaryItem[];
    action?: { label: string; href: string; className?: string };
    extraAction?: ReactNode;
    variant?: "default" | "danger";
    className?: string;
};

export default function PageSummary({
    title,
    items,
    action,
    extraAction,
    variant = "default",
    className,
}: PageSummaryProps) {
    const isDanger = variant === "danger";

    return (
        <div
            className={cn(
                "rounded-2xl p-4",
                isDanger
                    ? "border border-red-100 bg-red-50"
                    : "bg-primary/10",
                className,
            )}
        >
            {title ? (
                <h1
                    className={cn(
                        "font-bold mb-3",
                        isDanger
                            ? "text-red-600 text-base md:text-lg"
                            : "text-primary text-lg md:text-xl",
                    )}
                >
                    {title}
                </h1>
            ) : null}

            <div className="flex flex-col gap-1.5 text-sm">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-center gap-2",
                            item.className,
                        )}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            {action || extraAction ? (
                <div className="mt-4 flex justify-end">
                    {action ? (
                        <Link
                            href={action.href}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                                isDanger
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-primary hover:bg-primary/90",
                                action.className,
                            )}
                            style={{ color: "var(--color-primary-foreground)" }}
                        >
                            {action.label}
                        </Link>
                    ) : (
                        <div className="flex justify-end">{extraAction}</div>
                    )}
                </div>
            ) : null}
        </div>
    );
}