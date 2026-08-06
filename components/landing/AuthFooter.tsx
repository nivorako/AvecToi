import { LandingContainer } from "./components/LandingContainer";
import { FooterColumn } from "./components/FooterColumn";
import Link from "next/link";

export function AuthFooter() {
    return (
        <LandingContainer>
            <div className="flex flex-col justify-center items-center mb-12 gap-y-10">
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
        </LandingContainer>
    )
}