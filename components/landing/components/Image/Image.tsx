import NextImage from "next/image";

import { ImageProps } from "./type";

export function Image({ image, alt, className, width, height }: ImageProps) {
    return (
        <NextImage
            src={image}
            alt={alt ?? ""}
            className={className}
            width={width}
            height={height}
        />
    )
}