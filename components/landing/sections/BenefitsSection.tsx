
import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { SectionHeader } from "../components/SectionHeader";
import { LandingInfosCard } from "../components/LandingInfosCard";

export function BenefitsSection() {
    return (
        <Section>
            <LandingContainer>
                <div className="w-96 mx-auto mb-12">
                    <SectionHeader/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-3/4 mx-auto">
                    <LandingInfosCard />
                    <LandingInfosCard />
                    <LandingInfosCard />
                    <LandingInfosCard />
                </div>
            </LandingContainer>
        </Section>
    );
} 