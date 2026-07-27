import { Placeholder } from "./Placeholder";

export function LandingProblemCard(){
    return (
        <div className="rounded-lg bg-gray-100 p-6 space-y-4">
            <Placeholder type="icon" />
            <Placeholder type="cardTitle" />
            <Placeholder type="smallText" />

            <div className="border-t border-gray-300" />

            <Placeholder type="cardText" />
            <Placeholder type="cardText" />

             <div className="border-t border-gray-300" />
             
            <Placeholder type="cardText" />
            <Placeholder type="cardText" />
        </div>         
    );
}