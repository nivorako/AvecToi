import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type IconButtonVariant = "tertiary" | "ghost" | "danger";

const variantClasses: Record<IconButtonVariant, string> = {
    tertiary: "bg-card text-foreground ring-1 ring-border hover:bg-white/70",
    ghost: "bg-transparent text-foreground hover:bg-card",
    danger: "bg-danger text-danger-foreground hover:bg-danger/90",
};

export default function IconButton({
    variant = "tertiary",
    size = "md",
    isLoading = false,
    icon,
    className,
    disabled,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: IconButtonVariant;
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    icon: ReactNode;
}) {
    const sizeClass =
        size === "sm"
            ? "h-9 w-9"
            : size === "lg"
              ? "h-11 w-11"
              : "h-10 w-10";

    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            aria-busy={isLoading ? true : undefined}
            className={cn(
                "inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50",
                sizeClass,
                variantClasses[variant],
                isLoading ? "cursor-wait" : undefined,
                className,
            )}
        >
            {icon}
        </button>
    );
}
