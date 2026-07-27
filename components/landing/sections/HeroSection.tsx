import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { Placeholder } from "../components/Placeholder";
import { ImagePlaceholder } from "../components/ImagePlaceholder";
import { SectionHeader } from "../components/SectionHeader";

export function HeroSection() {
    return (
        <Section>        
            <LandingContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    <div className="flex flex-col items-center justify-center  min-h-[300px] space-y-8">

                       <SectionHeader />

                        <Placeholder type="button" />

                    </div>

                    <div>

                        <ImagePlaceholder />

                    </div>

                </div>

            </LandingContainer>
        </Section>
    );
}