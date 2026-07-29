import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { SectionHeader } from "../components/SectionHeader";
import { LandingInfosCard } from "../components/LandingInfosCard/LandingInfosCard";

import { securityBenefits } from "../data/security";

export function SecuritySection() {
    return (
        <Section>
            <LandingContainer>

                <div className="flex flex-col items-center gap-y-6 text-center max-w-3xl mx-auto mb-16">
                    <Heading as="h2" variant="h2">
                        Des informations sensibles, protégées avec soin
                    </Heading>
                    <Text variant="body">
                        Les informations concernant un proche sont personnelles. CareGroup est conçu pour permettre leur partage uniquement avec les personnes concernées, tout en laissant à l'administrateur du CareGroup la maîtrise des accès.
                    </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {securityBenefits.map((benefit, index) => (
                        <LandingInfosCard
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