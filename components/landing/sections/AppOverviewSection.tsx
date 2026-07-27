import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { SectionHeader } from "../components/SectionHeader";
import { LandingFeaturedCard } from "../components/LandingFeaturedCard";

export function AppOverviewSection() {
    return (
        <Section>
            <LandingContainer>
                <div className="flex flex-col items-center justify-center mb-4 w-4/5 mx-auto">
                    <SectionHeader/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-3/4 mx-auto">
                    <div className="md:col-span-2">
                        <LandingFeaturedCard />
                    </div>
                    <LandingFeaturedCard />
                    <LandingFeaturedCard />
                    <LandingFeaturedCard />
                    <LandingFeaturedCard />
                </div>
            </LandingContainer>
        </Section>
    );
} 