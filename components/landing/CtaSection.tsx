export function CtaSection() {
    return (
        <section id="cta" className="bg-primary px-6 py-16 text-center text-primary-foreground">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-4">Prêt à simplifier le quotidien de votre proche ?</h2>
                <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto leading-relaxed">
                    Rejoignez les familles qui utilisent Avec Toi pour coordonner les soins avec sérénité.
                </p>
                <a
                    href="/app"
                    className="btn-tertiary px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                    Créer mon compte gratuitement
                </a>
            </div>
        </section>
    );
}