const testimonials = [
    { name: "Marie, aidante familiale", quote: "Enfin un outil qui réunit toute la famille autour du suivi de ma mère." },
    { name: "Dr. Dupont, médecin traitant", quote: "Je retrouve facilement les informations médicales sans appels inutiles." },
];

export function TestimonialsSection() {
    return (
        <section id="testimonials" className="bg-background px-6 py-16">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-foreground text-center mb-12">Ils utilisent Avec Toi</h2>
                <div className="flex flex-col sm:flex-row gap-6">
                    {testimonials.map((t) => (
                        <blockquote key={t.name} className="bg-card border border-border rounded-xl p-6 flex-1 shadow-sm">
                            <p className="text-muted italic mb-4 leading-relaxed">"{t.quote}"</p>
                            <footer className="text-sm font-semibold text-foreground">— {t.name}</footer>
                        </blockquote>
                    ))}
                </div>
            </div>
        </section>
    );
}