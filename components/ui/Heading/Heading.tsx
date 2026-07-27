import { ElementType } from "react";
import { headingVariants, HeadingVariant } from "./headingVariants";
import type { HeadingProps } from "./type";

export function Heading<T extends ElementType = "h2">({
  as,
  variant,
  children,
  className = "",
}: HeadingProps<T>) {
  const Component = as ?? "h2";

  const currentVariant =
    variant ?? (Component as Exclude<HeadingVariant, "display">);

  return (
    <Component
      className={`${headingVariants[currentVariant]} ${className}`}
    >
      {children}
    </Component>
  );
}