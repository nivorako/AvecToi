import Image from "next/image";
import { HelloIllustrationProps } from "./type";
import {cn} from "@/lib/cn";

export function HeroIllustration ({ src, alt, width, height, className }: HelloIllustrationProps) {
    return (   
            <Image
                src={src}
                alt={alt}
                width={width || 600}
                height={height || 420}
                loading={src === "/img/home.webp" ? "eager" : undefined}
                className={cn("absolute z-10", className)}
            />
    );
}