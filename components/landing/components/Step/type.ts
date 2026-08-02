import { LucideIcon } from "lucide-react";

export type StepProps = {
    icon: LucideIcon;
    title: string;
    description: string;
    isLast?: boolean;
};