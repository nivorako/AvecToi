import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import  LinkButton  from "@/components/ui/LinkButton";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { HeroIllustration } from "../components/HeroIllustration";
import { illustrations } from "../data/illustrations";

export function HeroSection() {
    
    return (
        <Section>        
            <LandingContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="flex flex-col items-center justify-center text-center min-h-[300px] max-w-3xl mx-auto gap-y-8">

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

                        <LinkButton
                            href="/register"
                            size="lg"
                            className="mt-4"
                        >
                            Créer un CareGroup
                        </LinkButton>

                    </div> 

                    
                    <div className="relative max-w-[360px] lg:max-w-[520px] h-[560px] my-4 w-full md:my-0 mx-auto">
                        {illustrations.map((illus) => (
                            <HeroIllustration
                                key={illus.src}
                                src={illus.src}
                                alt={illus.alt}
                                width={illus.width}
                                height={illus.height}
                                className={illus.className}
                            />
                        ))}
                    </div>
                   
                </div>

            </LandingContainer>
        </Section>
    );
}