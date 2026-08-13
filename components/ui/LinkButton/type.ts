import type { ComponentProps } from "react";
import type Link from "next/link";
import type { ButtonSize, ButtonVariant } from "../Button/type";

export type LinkButtonProps = ComponentProps<typeof Link> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};