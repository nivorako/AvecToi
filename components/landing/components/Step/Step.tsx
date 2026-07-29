import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { StepProps } from "./type";

import { Placeholder } from "../Placeholder";
import { StepConnector } from "../StepConnector";

export function Step({
    title,
    description,
    isLast = false,
}: StepProps) {
    return (
        <div className="flex items-start gap-4 w-full">

            <div className="flex flex-col items-center">
                <Placeholder type="icon" />

                {!isLast && <StepConnector />}
            </div>

            <div className="flex-1 space-y-2">

                <Heading
                    as="h4"
                    variant="h3"
                >
                    {title}
                </Heading>

                <Text variant="small">
                    {description}
                </Text>

            </div>

        </div>
    );
}