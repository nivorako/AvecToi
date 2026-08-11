import { Icon } from "@/components/ui/Icon";
import { CareGroupCenterProps } from "./type";
import { Text } from "@/components/ui/Text";

export function CareGroupCenter({ description, title, icon }: CareGroupCenterProps) {
    return (
        <div className="flex flex-col items-center shrink-0 gap-2 w-32">
            <Icon icon={icon} />
            <Text
                as="span"
                variant="bodyLarge"
                className="font-semibold leading-tight"
            >
                {title}
            </Text>
        
            <Text 
                as="span" 
                variant="small"
                className="text-center"
            >
                {description}
            </Text>
            
        </div>
    );
}