import { StepConnector } from "./StepConnector";
import { CareGroupDiagramCard } from "./CareGroupDiagramCard/CareGroupDiagramCard";
import { CareGroupCenter } from "./CareGroupCenter";
import { UserRound, Users, HeartPulse, Stethoscope, Network } from "lucide-react";

export function CareGroupDiagram() {
    return (
        <div className="w-full max-w-lg md:max-w-xl mx-auto border border-gray-300 rounded-lg p-4 space-y-8">
            {/* Cercle du haut, centré */}
            <CareGroupDiagramCard
                icon={Users}
                text="Aidant"
            />
            
            <div className="flex justify-center">
                <StepConnector variant="verticalMid" />
            </div>

            {/* Ligne du milieu : cercle — trait — carrés empilés — trait — cercle */}
            <div className="flex items-center justify-center gap-4">

                <CareGroupDiagramCard
                    icon={UserRound}
                    text="Famille"
                />

                <StepConnector variant="horizontalMid" />

            {/* Bloc central  */}
                <CareGroupCenter 
                    icon={Network}
                    title="CareGroup"
                    description="Coordonne les échanges"
                
                />
 
                <StepConnector variant="horizontalMid" />

                <CareGroupDiagramCard
                    icon={HeartPulse}
                    text="Patient"
                />
            </div>

            <div className="flex justify-center">
                <StepConnector variant="verticalMid" />
            </div>

            {/*cercles en bas, centré */}
            
           <CareGroupDiagramCard 
                icon={Stethoscope}
                text="Professionnel"
           />
                
        </div>
    );
}