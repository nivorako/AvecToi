import { type ButtonProps } from "./type";
import { variantClasses, sizeClasses, baseClasses } from "./buttonVariant";

import { cn } from "@/lib/cn";

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
}: ButtonProps
) {
    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            aria-busy={isLoading ? true : undefined}
            className={cn(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
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
