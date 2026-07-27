import type { ElementType, ReactNode } from "react";
import type { TextVariant } from "./textVariants";

export type TextProps<T extends ElementType = "p"> = {
  as?: T;
  variant?: TextVariant;
  children: ReactNode;
  className?: string;
};