import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { Placeholder } from "../components/Placeholder";
import { LandingProblemCard } from "../components/LandingProblemCard";
import { SectionHeader } from "../components/SectionHeader";

export function ProblemSection() {
    return (
         <Section>        
                    <LandingContainer>      
                        <div className="grid grid-cols-1 space-y-8">      
                            <div className="flex justify-center items-center">      
                               <SectionHeader />
                            </div>       
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">       
                               <LandingProblemCard />
                               <LandingProblemCard />
                               <LandingProblemCard />
                               <LandingProblemCard />       
                            </div>  
                            <div className="flex justify-center mt-4">
                                <Placeholder type="transition" />
                            </div>     
                        </div>      
                    </LandingContainer>
                </Section>
        
    );
}