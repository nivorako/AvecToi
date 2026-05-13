import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "danger"
    | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 bg-transparent text-foreground hover:bg-card",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
};

export default function Button({
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}) {
    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            aria-busy={isLoading ? true : undefined}
            className={cn(
                variantClasses[variant],
                variant === "primary" || variant === "secondary" || variant === "danger"
                    ? sizeClasses[size]
                    : undefined,
                isLoading ? "cursor-wait" : undefined,
                className,
            )}
        >
            {leftIcon ? <span className="-ml-1">{leftIcon}</span> : null}
            <span className={cn(isLoading ? "opacity-70" : undefined)}>
                {children}
            </span>
            {rightIcon ? <span className="-mr-1">{rightIcon}</span> : null}
        </button>
    );
}
