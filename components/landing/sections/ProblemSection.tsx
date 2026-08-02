import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { LandingProblemCard } from "../components/LandingProblemCard/LandingProblemCard";

import { problems } from "../data/problems";

export function ProblemSection() {
    return (
         <Section>        
                    <LandingContainer>      
                        <div className="grid grid-cols-1 gap-y-12">      
                            <div className="flex flex-col justify-center items-center text-center gap-y-6 mx-auto">      
                                <Heading as="h2" variant="h2">
                                    Le constat
                                </Heading>

                                <Text variant="bodyLarge" className="max-w-3xl">
                                    Accompagner un proche devient vite complexe lorsque les informations sont dispersées.
                                </Text>
                            </div>       
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">       
                                {problems.map((problem, index) => (
                                    <LandingProblemCard 
                                        key={index}
                                        title={problem.title}
                                        quote={problem.quote}
                                        situation={problem.situation}
                                        result={problem.result}
                                        icon={problem.icon}
                                    />
                                ))}
                            </div>  
                            <div className="flex justify-center mt-4">
                                <Text
                                    variant="bodyLarge"
                                    className="max-w-2xl text-center"
                                >
                                    C'est pour répondre à ces situations que CareGroup a été créé.
                                </Text>
                            </div>     
                        </div>      
                    </LandingContainer>
                </Section>
        
    );
}