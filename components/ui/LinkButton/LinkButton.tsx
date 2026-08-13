import Link from "next/link";

import { cn } from "@/lib/cn";
import { linkButtonVariants, sizeClasses } from "./LinkButtonVariants";
import type { LinkButtonProps } from "./type";

export default function LinkButton({
    variant = "primary",
    size = "md",
    className,
    children,
    ...props
}: LinkButtonProps) {
    return (
        <Link
            {...props}
            className={cn(
                linkButtonVariants[variant],
                sizeClasses[size],
                className,
            )}
        >
            {children}
        </Link>
    );
}