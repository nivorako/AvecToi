import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { Placeholder } from "../components/Placeholder";
import { StepPlaceholder } from "../components/StepPlaceholder";
import { SchemaPlaceholder } from "../components/SchemaPlaceholder";

import { SectionHeader } from "../components/SectionHeader";



export function SolutionSection() {
    return (
        <Section >
            <LandingContainer>
                <div className="flex flex-col items-center justify-center space-y-2">
                    <SectionHeader/>
                    <SchemaPlaceholder/>           
                </div>
                <div className="flex flex-col items-center justify-center mt-14 space-y-6 w-96 mx-auto">
                    <div>
                        <Placeholder type="stepTitle" />
                    </div>
                    <StepPlaceholder />         
                    <StepPlaceholder />
                    <StepPlaceholder isLast/>
                </div>
            </LandingContainer>
        </Section>
    );
}