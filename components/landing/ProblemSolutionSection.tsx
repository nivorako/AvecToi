export function ProblemSolutionSection() {
    return (
        <section id="problem" className="bg-background px-6 py-16 text-center">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-foreground mb-4">Le problème</h2>
                <p className="text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
                    Coordonner les soins d'un proche atteint d'une maladie neurodégénérative est épuisant.
                    Informations éparpillées, oublis, malentendus entre famille et médecins.
                </p>
                <div className="border-t border-border pt-12">
                    <h2 className="text-3xl font-bold text-foreground mb-4">La solution</h2>
                    <p className="text-muted max-w-2xl mx-auto leading-relaxed">
                        Avec Toi rassemble tout en un seul endroit : dossiers, tâches, messages,
                        calendrier et informations d'urgence — accessibles par toute l'équipe de soins.
                    </p>
                </div>
            </div>
        </section>
    );
}