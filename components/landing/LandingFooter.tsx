// @c:\Users\rakotondrabe\Documents\next js\avectoi\components\landing\LandingFooter.tsx
import { Section } from "./components/Section";
import { LandingContainer } from "./components/LandingContainer";
import { Logo } from "./components/Logo";
import { FooterColumn } from "./components/FooterColumn";
import Link from "next/link";

export function LandingFooter() {
    return (
        <Section>
            <LandingContainer>
                <div className="flex flex-col justify-center items-center mb-12 gap-y-10">
                    <Logo />
                    <p className="text-center text-muted">Courte phrase</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-8 max-w-sm mx-auto md:max-w-none">
                    <FooterColumn title="CareGroup">
                        <p className="text-sm text-muted">Courte présentation careGroup.</p>
                        
                    </FooterColumn>

                    <FooterColumn title="Produit">
                        <nav>
                            <ul className="space-y-2">
                            <li>
                                <Link href="#" className="text-muted hover:text-foreground">Fonctionnement</Link>
                            </li>
                            <li>
                                <Link href="#" className="text-muted hover:text-foreground">Sécurité</Link>
                            </li>
                            <li>
                                <Link href="#" className="text-muted hover:text-foreground">FAQ</Link>
                            </li>
                            <li>
                                <Link href="#" className="text-muted hover:text-foreground">Connexion</Link>
                            </li>
                        </ul>
                        </nav>
                    </FooterColumn>

                    <FooterColumn title="Légal">
                        <nav>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="#" className="text-muted hover:text-foreground">confidentialité</Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-muted hover:text-foreground">Mentions légales</Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-muted hover:text-foreground">Contact</Link>
                                </li>
                            </ul>
                        </nav>
                    </FooterColumn>
                </div>
                <div className="border-t border-muted m-14" />
                <div className="flex flex-col md:flex-row justify-around  items-center gap-4 w-full max-w-sm mx-auto md:max-w-none mt-12">
                    <p className="w-auto">
                        © 2026 CareGroup
                    </p>
                    <p className="w-auto">
                        Conçu pour faciliter l'accompagnement des proches.
                    </p>
                </div>
            </LandingContainer>
        </Section>
    );
}