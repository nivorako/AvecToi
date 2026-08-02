
import { StepConnectorVariant } from "./type";

export const variantClasses: Record<StepConnectorVariant, string> = {
    vertical: "h-16 w-[2px]",
    horizontal: "h-[2px] w-16",
    horizontalMid: "h-[2px] w-8",
    verticalMid: "h-8 w-[2px]",
};