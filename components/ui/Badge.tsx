import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant = "default" | "primary" | "danger" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-card text-foreground ring-1 ring-border",
    primary: "bg-primary/10 text-primary ring-1 ring-primary/20",
    danger: "bg-danger/10 text-danger ring-1 ring-danger/20",
    muted: "bg-card text-muted ring-1 ring-border",
};

export default function Badge({
    variant = "default",
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
    return (
        <span
            {...props}
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                variantClasses[variant],
                className,
            )}
        />
    );
}
