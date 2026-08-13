import { LandingContainer } from "./components/LandingContainer";
import { Logo } from "@/components/ui/Logo/Logo";
import Link from "next/link";
export function AuthHeader() {
    return (    
        <LandingContainer>
            <div className="flex items-center jusify-center py-8">
                <Link 
                    href="/"
                    className="inline-block"
                >
                    <Logo 
                        src="/icons/icon-192.png" 
                        alt="Logo-retour à l'accueil" 
                        width={100} 
                        height={100} 
                        className="rounded-md"
                    />
                </Link>
            </div>
        </LandingContainer>
    )
} 