import { ImageProps } from "./type";

export function Image({ image, alt, className, width, height }: ImageProps) {
    return (
        <img
            src={image}
            alt={alt ?? ""} 
            className={className}
            width={width}
            height={height}
        />
    )
}