import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { Step } from "../components/Step";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { CareGroupDiagram } from "../components/CareGroupDiagram";

import { steps } from "../data/steps";

export function SolutionSection() {
    return (
        <Section>
            <LandingContainer>
                <div className="flex flex-col items-center gap-y-16">

                    <div className="flex flex-col items-center gap-y-6 text-center max-w-3xl mx-auto">
                        <Heading as="h2" variant="h2">
                            Comment CareGroup vous accompagne au quotidien
                        </Heading>

                        <Text variant="bodyLarge">
                            Plutôt que de multiplier les appels, les messages et les documents dispersés, CareGroup réunit les informations importantes dans un espace partagé. Chacun y accède selon son rôle, participe à l'organisation et suit ce qui le concerne.
                        </Text>
                    </div>

                    <CareGroupDiagram />

                    <div className="flex flex-col items-center gap-y-6 w-96 mx-auto">
                        <div>
                            <Heading as="h3" variant="h3">
                                Démarrer est simple
                            </Heading>
                                
                        </div>
                        {steps.map((step, index) => (
                            <Step 
                                key={step.title}
                                isLast={index === steps.length - 1}
                                {...step}
                            />
                        ))}
                    </div>

                </div>
            </LandingContainer>
        </Section>
    );
}