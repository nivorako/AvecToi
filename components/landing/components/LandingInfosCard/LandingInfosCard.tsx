import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { LandingInfoscardProps } from "./type";
import { Icon } from "@/components/ui/Icon";

export function LandingInfosCard({title, subtitle, description, icon }: LandingInfoscardProps) {
    return (
        <div className="flex flex-col justify-between gap-4 p-6 shadow-card">

            <div className="flex items-start  gap-3">
                <Icon icon={icon} />
                <div>
                    <Heading as="h3" variant="h3">
                        {title}
                    </Heading>
                    {subtitle && (
                        <Text variant="small">
                            {subtitle}
                        </Text>
                    )}
                </div> 
            </div>

            <Text variant="small">
                {description}
            </Text>

        </div>
    )
} ;