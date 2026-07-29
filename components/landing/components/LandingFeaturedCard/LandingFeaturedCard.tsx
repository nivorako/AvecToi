import { cn } from "@/lib/cn";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { ImagePlaceholder } from "../ImagePlaceholder";
import { LandingFeatureCardProps } from "./type";

export function LandingFeaturedCard(
    {
        title, 
        description, 
        featured
    }: LandingFeatureCardProps) {
    return(
        <div className={cn("flex flex-col items-center gap-4 p-6 shadow-sm", featured && "md:col-span-2")}>
            <Heading as="h3" variant="h3">
                {title}
            </Heading>
            <ImagePlaceholder/>
            <Text
                variant="body"
            >
                {description}
            </Text> 
        </div>
    )
}