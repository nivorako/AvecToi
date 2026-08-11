import { cn } from "@/lib/cn";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { ImagePlaceholder } from "../ImagePlaceholder";
import { LandingFeatureCardProps } from "./type";

import Image from "next/image";

export function LandingFeatureCard(
    {
        title, 
        description, 
        featured,
        mobileImage,
        imageAlt,
        desktopImage,
    }: LandingFeatureCardProps) { 

    return(
        <div className={cn("flex flex-col items-center justify-center gap-4 p-6 shadow-card", featured && "md:col-span-2")}>
            <Heading as="h3" variant="h3">
                {title}
            </Heading>

            <div 
                className={cn(
                    "relative w-full overflow-hidden rounded-xl",
                    featured ? "h-[600px] md:h-auto md:aspect-[1568/825]" : "h-[420px]"
                )}    
            >
                {mobileImage || desktopImage ? (
                    <>
                        {mobileImage && (
                            <Image
                                src={mobileImage}
                                alt={imageAlt ?? title}
                                fill
                                className={cn(
                                    "object-contain object-center",
                                    desktopImage && "md:hidden"
                                )}
                            />
                        )}

                        {desktopImage && (
                            <Image
                                src={desktopImage}
                                alt={imageAlt ?? title}
                                fill
                                className="hidden object-contain object-center md:block"
                            />
                        )}
                    </>
                ) : (
                    <ImagePlaceholder featured={featured} />
                )}
            </div>

            <Text
                variant="body"
            >
                {description}
            </Text> 
        </div>
    )
}