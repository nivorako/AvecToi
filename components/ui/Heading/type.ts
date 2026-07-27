import type { ElementType, ReactNode } from "react";
import type { HeadingVariant } from "./headingVariants";

export type HeadingProps<T extends ElementType = "h2"> = {
  as?: T;
  variant?: HeadingVariant;
  children: ReactNode;
  className?: string;
};