import { cn } from "@/lib/cn";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { ImagePlaceholder } from "../ImagePlaceholder";
import { LandingFeatureCardProps } from "./type";

export function LandingFeaturedCard(
    {
        title, 
        description, 
        featured,
        image,
        imageAlt,
    }: LandingFeatureCardProps) { 
    return(
        <div className={cn("flex flex-col items-center justify-center gap-4 p-6 shadow-sm", featured && "md:col-span-2")}>
            <Heading as="h3" variant="h3">
                {title}
            </Heading>
            {
                image ? (
                    <div className={cn(
                        "relative w-full overflow-hidden rounded-xl",
                        featured ? "h-[600px]" : "h-[420px]"
                    )}>
                        <img
                            src={image}
                            alt={imageAlt ?? title}
                            className="absolute inset-0 h-full w-full object-contain object-center"
                        />
                    </div>
                ) : (
                    <ImagePlaceholder featured={featured} />
                )
            }
            <Text
                variant="body"
            >
                {description}
            </Text> 
        </div>
    )
}