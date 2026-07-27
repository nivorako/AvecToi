import { SectionHeaderProps } from "./type";

export function SectionHeader({
    children,
    align = "center",
    className = "",
}: SectionHeaderProps) {

    const alignment = {
        left: "items-start text-left",
        center: "items-center text-center",
    };

    return (
        <div
            className={`
                flex flex-col gap-4
                ${alignment[align]}
                ${className}
            `}
        >
            {children}
        </div>
    );
}