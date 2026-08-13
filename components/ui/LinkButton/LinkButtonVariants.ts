import type { ButtonVariant } from "../Button/type";
import type { ButtonSize } from "../Button/type";

export const linkButtonVariants: Record<ButtonVariant, string> = {
    primary: "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/50",
    secondary: "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors bg-primary/15 text-primary ring-1 ring-primary/25 hover:bg-primary/20",
    tertiary: "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors bg-card text-foreground ring-1 ring-border hover:bg-white/70",
    danger: "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-danger text-danger-foreground hover:bg-danger/90",
    ghost: "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors bg-transparent text-foreground hover:bg-card",
};

export const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
};