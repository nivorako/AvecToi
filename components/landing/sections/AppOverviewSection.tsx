import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { LandingFeaturedCard } from "../components/LandingFeaturedCard";

import { featuredCards } from "../data/features";

export function AppOverviewSection() {
    return (
        <Section>
            <LandingContainer>
                <div className="flex flex-col items-center justify-center mb-4 mx-auto gap-y-6">
                    <Heading as="h2" variant="h2">
                        Découvrez CareGroup
                    </Heading>

                    <Text
                        variant="bodyLarge"
                        className="max-w-3xl"
                    >
                        Un espace unique pour centraliser les dossiers, les échanges, les rendez-vous et les informations importantes.
                    </Text>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mx-auto">
                    {featuredCards.map((card) => (
                        <LandingFeaturedCard
                            key={card.title}
                            title={card.title}
                            description={card.description}
                            featured={card.featured}
                        />
                    ))}
                </div>
            </LandingContainer>
        </Section>
    );
} 