import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { ImagePlaceholder } from "../components/ImagePlaceholder";

export function HeroSection() {
    return (
        <Section>        
            <LandingContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    <div className="flex flex-col items-center justify-center text-center min-h-[300px] space-y-8">

                         <Heading
                            as="h1"
                            variant="display"
                        >
                            Prenez soin de vos proches,
                            ensemble.
                        </Heading>

                        <Text variant="bodyLarge">
                            Créez un espace partagé pour organiser
                            l'accompagnement d'un proche avec votre
                            famille et vos aidants.
                        </Text>

                        <Button 
                            size="lg"
                        >
                            Créer un CareGroup
                        </Button>

                    </div> 

                    <div>

                        <ImagePlaceholder />

                    </div>

                </div>

            </LandingContainer>
        </Section>
    );
}