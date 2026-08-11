import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { LandingInfosCard } from "../components/LandingInfosCard/LandingInfosCard";

import { benefits } from "../data/benefits";

export function BenefitsSection() {
    return (
        <Section>
            <LandingContainer>

                <div className="flex flex-col items-center gap-y-6 text-center max-w-3xl mx-auto mb-10">
                     <Heading
                        as="h2"
                        variant="h2"
                    >
                        Les bénéfices
                    </Heading>

                    <Text variant="bodyLarge">
                        Découvrez comment CareGroup simplifie l'organisation familiale et améliore la coordination entre tous les proches.
                    </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {benefits.map((benefit) => (
                        <LandingInfosCard
                            icon={benefit.icon}
                            key={benefit.title}
                            title={benefit.title}
                            description={benefit.description}
                        />
                    ))}
                </div>

            </LandingContainer>
        </Section>
    );
} 