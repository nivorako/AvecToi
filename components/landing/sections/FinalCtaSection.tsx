import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import LinkButton from "@/components/ui/LinkButton";
import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";


export function FinalCtaSection() {
    return (
        <Section>
            <LandingContainer>

                <div className="flex flex-col items-center gap-y-6 text-center max-w-3xl mx-auto mb-16">
                    <Heading as="h2" variant="h2">
                        Prêt à mieux organiser l'accompagnement de votre proche ?
                    </Heading>
                    <Text variant="body">
                        Créez votre premier CareGroup et invitez les personnes qui accompagnent votre proche au quotidien. En quelques minutes, toute votre famille peut commencer à partager les informations importantes et mieux s'organiser.
                    </Text>
                </div>

                <div className="flex flex-col gap-y-8 items-center justify-center">
                    <Text
                        variant="bodyLarge"
                        className="font-medium"
                    >
                        Commencez en quelques minutes.
                    </Text>
                    <LinkButton 
                        href="/register"
                        size="lg"
                        variant="primary"
                    >
                        Créer mon premier CareGroup
                    </LinkButton>
                    <Text
                        variant="small"
                        className="text-muted"
                    >
                        Gratuit au démarrage • Invitez votre famille dès la création.
                    </Text>
                </div>

            </LandingContainer>
        </Section>
    );
}