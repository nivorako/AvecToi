import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...props}
            className={cn(
                "rounded-2xl border border-border bg-card p-5 shadow-sm",
                className,
            )}
        />
    );
}

export function CardHeader({
    title,
    action,
    className,
}: {
    title: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center justify-between gap-4", className)}>
            <div className="text-base font-semibold">{title}</div>
            {action ? <div>{action}</div> : null}
        </div>
    );
}

export function CardContent({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={cn("mt-4", className)} />;
}
