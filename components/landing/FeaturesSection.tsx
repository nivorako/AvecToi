const features = [
    { title: "Dossiers médicaux", description: "Centralisez documents et informations par type de soin." },
    { title: "Tâches & responsabilités", description: "Assignez des tâches aux membres de l'équipe avec suivi." },
    { title: "Messagerie", description: "Communiquez directement au sein du groupe de soins." },
    { title: "Calendrier", description: "Visualisez les rendez-vous et échéances en un coup d'œil." },
    { title: "Section urgences", description: "Informations critiques accessibles rapidement en cas de besoin." },
    { title: "Rôles & permissions", description: "Famille, médecins, patients — chacun voit ce qui le concerne." },
];

export function FeaturesSection() {
    return (
        <section id="features" className="px-6 py-16 bg-card">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-foreground text-center mb-12">Fonctionnalités</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div key={f.title} className="bg-background border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                            <p className="text-muted text-sm leading-relaxed">{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}