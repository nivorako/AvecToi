import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { ButtonVariant, ButtonSize } from "./Button/Button";

// Au lieu de variantClasses[variant] dans un objet,
// utilise une fonction avec des strings complètes visibles au scan :
function getVariantClasses(variant: ButtonVariant): string {
    if (variant === "primary")
        return "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-[#2a8cbe] text-white hover:bg-primary/90";
    if (variant === "secondary")
        return "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors bg-primary/15 text-primary ring-1 ring-primary/25 hover:bg-primary/20";
    if (variant === "tertiary")
        return "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors bg-card text-foreground ring-1 ring-border hover:bg-white/70";
    if (variant === "danger")
        return "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-danger text-danger-foreground hover:bg-danger/90";
    return "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-transparent text-foreground hover:bg-card";
};

const sizeClasses: Record<ButtonSize, string> = { 
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
};

export default function LinkButton({
    variant = "primary",
    size = "md",
    className,
    children,
    ...props
}: ComponentProps<typeof Link> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
}) { 
    return (
        <Link
            {...props}
            className={cn(getVariantClasses(variant), sizeClasses[size], className)}
        >
            {children}
        </Link>
    );
}