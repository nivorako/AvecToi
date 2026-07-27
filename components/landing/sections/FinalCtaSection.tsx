import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { SectionHeader } from "../components/SectionHeader";
import { Placeholder } from "../components/Placeholder";

export function FinalCtaSection() {
    return (
        <Section>
            <LandingContainer>
                <div className="w-96 mx-auto mb-12">
                    <SectionHeader/>
                </div>
                <div className="flex flex-col space-y-8 items-center justify-center gap-4 w-3/4 mx-auto">
                    <Placeholder type="cardTitle" />
                    <Placeholder type="button" />
                    <Placeholder type="smallText" />
                </div>
            </LandingContainer>
        </Section>
    );
}