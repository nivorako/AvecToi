import { Placeholder } from "./Placeholder";

export function LandingInfosCard() {
    return (
        <div className="flex flex-col gap-4 p-6 shadow-sm">
            <div className="flex gap-2">
                <Placeholder type="icon"/>
                <Placeholder type="cardTitle"/>
            </div>
            <Placeholder type="cardText"/>
            <Placeholder type="smallText"/>
        </div>
    )
}