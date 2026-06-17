import Link from "next/link";

import LocationWidget from "./LocationWidget";
import { requireUser } from "@/lib/requireUser";

export default async function CareGroupEmergencyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireUser();

    const baseUrl = `/app/caregroup/${id}`;

    return (
        <div className="flex flex-col gap-5 pb-20">

            {/* Section 1 — Résumé urgence */}
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                <h2 className="text-base font-bold text-red-600 mb-3">Résumé urgence</h2>
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                        <span>🆘</span>
                        <span>Fiche d&​apos;urgence disponible</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>👥</span>
                        <span>3 contacts prioritaires</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <span>💊</span>
                        <span>2 traitements enregistrés</span>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Link
                        href={`${baseUrl}/history`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        Voir tout
                    </Link>
                </div>
            </div>

            {/* Section 2 — Appeler rapidement */}
            <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Appeler rapidement</h2>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "SAMU", tel: "15", icon: "🚑" },
                        { label: "Pompiers", tel: "18", icon: "🚒" },
                        { label: "Police", tel: "17", icon: "👮" },
                        { label: "Contact clé", tel: "", icon: "📞" },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.tel ? `tel:${item.tel}` : `${baseUrl}/emergency`}
                            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-muted/10 active:scale-95 transition-transform"
                        >
                            <span className="text-3xl">{item.icon}</span>
                            <span className="text-sm font-semibold">{item.label}</span>
                            {item.tel && <span className="text-xs text-muted">Appel {item.tel}</span>}
                        </a>
                    ))}
                </div>
            </div>

            {/* Section 3 — Personnes à prévenir */}
            <div>
                <h2 className="text-base font-semibold mb-3">Personnes à prévenir</h2>
                <div className="flex flex-col gap-2">
                    {[
                        { name: "Marie Dupont", role: "Fille", tel: "" },
                        { name: "Paul Dupont", role: "Conjoint", tel: "" },
                    ].map((contact) => (
                        <div key={contact.name} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                    {contact.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">{contact.name}</div>
                                    <div className="text-xs text-muted">{contact.role}</div>
                                </div>
                            </div>
                            <a
                                href={contact.tel ? `tel:${contact.tel}` : "#"}
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                                </svg>
                                Appeler
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 4 — Informations essentielles */}
            <div>
                <h2 className="text-base font-semibold mb-3">Informations essentielles</h2>
                <div className="flex flex-col gap-2">
                    {[
                        { icon: "🩸", label: "Groupe sanguin : O+" },
                        { icon: "⚠️", label: "Allergie : Pénicilline" },
                        { icon: "💊", label: "Anticoagulant quotidien" },
                        { icon: "❤️", label: "Hypertension" },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                            <span className="text-xl shrink-0">{item.icon}</span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 5 — Contacts médicaux */}
            <div>
                <h2 className="text-base font-semibold mb-3">Contacts médicaux</h2>
                <div className="flex flex-col gap-2">
                    {[
                        { icon: "👨‍⚕️", name: "Dr Martin", role: "Médecin traitant", tel: "" },
                        { icon: "🏥", name: "Clinique de référence", role: "", tel: "" },
                        { icon: "💊", name: "Pharmacie habituelle", role: "", tel: "" },
                    ].map((contact) => (
                        <div key={contact.name} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl shrink-0">{contact.icon}</span>
                                <div>
                                    <div className="text-sm font-semibold">{contact.name}</div>
                                    {contact.role && <div className="text-xs text-muted">{contact.role}</div>}
                                </div>
                            </div>
                            <a
                                href={contact.tel ? `tel:${contact.tel}` : "#"}
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                                </svg>
                                Appeler
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 6 — Documents essentiels */}
            <div>
                <h2 className="text-base font-semibold mb-3">Documents essentiels</h2>
                <div className="flex flex-col gap-2">
                    {[
                        { label: "Carte Vitale", href: `${baseUrl}/cases` },
                        { label: "Carte Mutuelle", href: `${baseUrl}/cases` },
                        { label: "Ordonnance principale", href: `${baseUrl}/cases` },
                        { label: "Directives anticipées", href: `${baseUrl}/cases` },
                    ].map((doc) => (
                        <Link
                            key={doc.label}
                            href={doc.href}
                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:bg-card/70"
                        >
                            <div className="flex items-center gap-3">
                                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span className="text-sm font-medium">{doc.label}</span>
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Section 7 — Géolocalisation */}
            <div>
                <h2 className="text-base font-semibold mb-3">Localisation (si activée)</h2>
                <LocationWidget />
            </div>

            {/* Bouton flottant */}
            <div className="fixed bottom-24 right-4 z-30">
                <Link
                    href={`${baseUrl}/emergency`}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 text-2xl"
                    aria-label="Ajouter une information d'urgence"
                >
                    +
                </Link>
            </div>

        </div>
    );
}