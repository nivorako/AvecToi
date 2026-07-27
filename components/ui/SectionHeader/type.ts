import { ReactNode } from "react";

export type SectionHeaderProps = {
    children: ReactNode;
    align?: "left" | "center";
    className?: string;
};