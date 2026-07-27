import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

import { Section } from "../components/Section";
import { LandingContainer } from "../components/LandingContainer";
import { LandingProblemCard } from "../components/LandingProblemCard/LandingProblemCard";

const problems = [
    {
        title: "Retrouver la bonne information au bon moment",
        quote: "Quel est exactement son traitement ?",
        situation: "Un professionnel de santé demande une information précise, mais celle-ci est détenue par une autre personne ou dans un document difficile à retrouver.",
        result: "La coordination ralentit et une personne doit toujours faire le lien entre tout le monde."
    },
    {
        title: "Réagir quand un proche perd ses repères",
        quote: "Elle est partie, où peut-elle être ?",
        situation: "Avec l'évolution de la maladie, certaines situations nécessitent une réaction rapide.",
        result: "Les proches doivent pouvoir retrouver les informations essentielles et agir rapidement."
    },
    {
        title: "Être prêt quand personne n'est présent",
        quote: "Que faut-il savoir en cas d'urgence ?",
        situation: "Un malaise ou un incident survient à l'extérieur ou sans proche à proximité.",
        result: "Les informations importantes doivent être accessibles rapidement aux bonnes personnes."
    },
    {
        title: "Ne plus dépendre d'une seule personne",
        quote: "Qui suit cette démarche ?",
        situation: "Les démarches administratives, personnelles ou familiales impliquent plusieurs personnes.",
        result: "Sans organisation commune, les informations se dispersent et les actions deviennent difficiles à suivre."
    }
]

export function ProblemSection() {
    return (
         <Section>        
                    <LandingContainer>      
                        <div className="grid grid-cols-1 gap-y-12">      
                            <div className="flex flex-col justify-center items-center gap-y-6">      
                                <Heading as="h2" variant="h2">
                                    Le constat
                                </Heading>

                                <Text variant="bodyLarge">
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