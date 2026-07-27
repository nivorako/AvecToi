import { Placeholder } from "./Placeholder";

export function LandingCard() {
    return (
        <div className="rounded-lg bg-gray-100 p-6 space-y-4">
            <Placeholder type="icon" />
            <Placeholder type="cardTitle" />
            <Placeholder type="cardDescription" />
        </div>         
    );
}