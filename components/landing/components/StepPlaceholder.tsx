import { Placeholder } from "./Placeholder";
import { StepConnector } from "./StepConnector";

export function StepPlaceholder({ isLast = false }: { isLast?: boolean }) {
    return (
        <div className="flex items-start gap-4 w-full">
            <div className="flex flex-col items-center">
                <Placeholder type="icon" />
                {!isLast && <StepConnector />}
            </div>
            <div className="flex-1">
                <Placeholder type="cardTitle" />
            </div>
        </div>
    );
}