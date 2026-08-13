import { cn } from "@/lib/cn";
import { IconProps } from "./type"; 

export function Icon({
    icon: IconComponent,
    size = 24,
    className,
}: IconProps) {
    return (
        <IconComponent
            size={size}
            aria-hidden="true"
            className={cn(
                "text-primary shrink-0",
                className
            )}
        />
    );
}