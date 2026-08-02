import { ImageProps } from "./type";

export function Image({ image, title, className, width, height }: ImageProps) {
    return (
        <img
            src={image}
            alt={title} 
            className={className}
            width={width}
            height={height}
        />
    )
}