import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { LandingProblemCardProps } from "./type";
import { Icon } from "@/components/ui/Icon";

export function LandingProblemCard({
    title,
    quote,
    situation,
    result,
    icon,
}: LandingProblemCardProps){
    return (
        <div className="rounded-lg bg-gray-100 p-6 space-y-6">
            <Icon icon={icon} />
            <Heading
                as="h3"
                variant="h3"
            >
                {title}
            </Heading>

            <Text variant="small">
                {quote}
            </Text>

            <div className="border-t border-gray-300" />

            <Text variant="small">
                {situation}
            </Text>

            <div className="border-t border-gray-300" />
            <Text variant="small">
                {result}
            </Text>
                
        </div>         
    );
} 