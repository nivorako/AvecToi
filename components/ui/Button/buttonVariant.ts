import { type ButtonVariant, type ButtonSize } from "./type";

export const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-primary text-primary-foreground hover:bg-primary/90",

    secondary:
        "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15",

    tertiary:
        "bg-card text-foreground ring-1 ring-border hover:bg-background",

    danger:
        "bg-danger text-danger-foreground hover:bg-danger/90",

    ghost:
        "bg-transparent text-foreground hover:bg-background",
};

export const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
};

export const baseClasses =
    "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
