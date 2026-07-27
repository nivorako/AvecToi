import { Placeholder } from "./Placeholder";
import { ImagePlaceholder } from "./ImagePlaceholder";

export function LandingFeaturedCard() {
    return(
        <div className="flex flex-col gap-4 p-6 shadow-sm">
            <Placeholder type="cardTitle"/>
            <ImagePlaceholder/>
            <Placeholder type="cardText"/>
            <Placeholder type="smallText"/>  
        </div>
    )
}