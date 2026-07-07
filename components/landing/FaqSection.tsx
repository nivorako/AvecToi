const faqs = [
    { q: "Qui peut accéder aux données ?", a: "Uniquement les membres invités par le propriétaire du groupe de soins." },
    { q: "Les données sont-elles sécurisées ?", a: "Oui, l'accès est strictement contrôlé par rôles et permissions." },
    { q: "Est-ce gratuit ?", a: "L'application est gratuite pour les familles aidantes." },
    { q: "Puis-je inviter un médecin ?", a: "Oui, vous pouvez inviter des professionnels de santé avec un rôle limité en lecture." },
];

export function FaqSection() {
    return (
        <section id="faq" className="bg-card px-6 py-16">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-foreground text-center mb-12">Questions fréquentes</h2>
                <div className="flex flex-col gap-6">
                    {faqs.map((item) => (
                        <div key={item.q} className="bg-background border border-border rounded-xl p-6">
                            <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                            <p className="text-muted text-sm leading-relaxed">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}