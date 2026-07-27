import { ElementType, ReactNode } from "react";
import { headingVariants, HeadingVariant } from "./headingVariants";

type HeadingProps<T extends ElementType = "h2"> = {
  as?: T;
  variant?: HeadingVariant;
  children: ReactNode;
  className?: string;
};

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