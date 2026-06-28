import Link from "next/link";

import { cn } from "@/lib/cn";

export default function BackButton({
    href,
    label = "Retour",
    className,
}: {
    href: string;
    label?: string;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10",
                className,
            )}
        >
            <span aria-hidden="true">←</span>
            <span>{label}</span>
        </Link>
    );
}
