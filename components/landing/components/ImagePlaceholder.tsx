import {cn} from "@/lib/cn";

export function ImagePlaceholder({featured=false} : {featured?: boolean}) {
    return(
        <div className={cn("h-[420px] w-full rounded-xl bg-border", featured ? "h-[600px]" : "h-[420px]")} />
    )
}