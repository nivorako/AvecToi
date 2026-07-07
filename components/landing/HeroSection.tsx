export function HeroSection() {
    return (
        <section id="hero" className="flex flex-col items-center justify-center min-h-[80vh] bg-card px-6 text-center">
            <h1 className="text-5xl font-bold text-foreground mb-6 max-w-3xl">
                Prenez soin de vos proches, ensemble.
            </h1>
            <p className="text-xl text-muted max-w-2xl mb-10 leading-relaxed">
                Avec Toi centralise les dossiers médicaux, les tâches et la communication
                entre aidants familiaux et professionnels de santé.
            </p>
            <a
                href="/app"
                className="btn-primary px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-shadow"
            >
                Commencer gratuitement
            </a>
        </section>
    );
}