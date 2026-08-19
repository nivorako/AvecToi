import { LandingContainer } from "./components/LandingContainer";
import { Logo } from "@/components/ui/Logo/Logo";
import Link from "next/link";
export function AuthHeader() {
    return (    
        <LandingContainer>
            <div className="flex items-center jusify-center py-3 w-[50%] mx-auto">
                <Link 
                    href="/"
                    className="inline-block"
                >
                    <Logo 
                        src="/icons/icon-192.png" 
                        alt="Logo-retour à l'accueil" 
                        width={200} 
                        height={200} 
                        className="rounded-md mix-blend-multiply"
                    />
                </Link>
            </div>
        </LandingContainer>
    )
} 