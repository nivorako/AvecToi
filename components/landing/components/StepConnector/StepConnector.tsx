import { cn } from "@/lib/cn";
import { StepConnectorProps } from "./type";
import { variantClasses } from "./stepConnectorVariant";

export function StepConnector({
    variant = "vertical",
    className,
}: StepConnectorProps) {
    return (
        <div
            className={cn(
                "shrink-0 rounded-full bg-primary",
                variantClasses[variant],
                className,
            )}
        />
    );
}