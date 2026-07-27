import { ElementType } from "react";
import { textVariants } from "./textVariants";
import { TextProps } from "./type";

export function Text<T extends ElementType = "p">({
    as,
    variant = "body",
    children,
    className,
}: TextProps<T>) {

    const Component = as ?? "p";

    return (
        <Component
            className={`${textVariants[variant]} ${className}`}
        >
            {children}
        </Component>
    );
}