import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "ghost";

export type ButtonSize =
    | "sm"
    | "md"
    | "lg";

export type ButtonProps =
    ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: ButtonVariant;
        size?: ButtonSize;
        isLoading?: boolean;
        leftIcon?: ReactNode;
        rightIcon?: ReactNode;
    };