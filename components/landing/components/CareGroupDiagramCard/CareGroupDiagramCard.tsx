
import { CareGroupDiagramCardProps } from "./type";
import { Icon } from "@/components/ui/Icon";

export function CareGroupDiagramCard({ icon, text }: CareGroupDiagramCardProps) {
    return (
        <div className="flex flex-col justify-center w-24 mx-auto shrink-0 items-center gap-2">
            <Icon icon={icon} />
            {text}
        </div>
    );
} 