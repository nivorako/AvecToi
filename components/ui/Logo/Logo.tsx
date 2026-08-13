export type LogoProps = {
    src?: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
}

export function Logo({src, alt, width, height, className}: LogoProps){
    return(
        <img 
            src={src} 
            alt={alt} 
            width={width} 
            height={height} 
            className={className} 
        />
    )
};