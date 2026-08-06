import { LandingContainer } from "./components/LandingContainer";
import Image from "next/image";

export function AuthHeader() {
    return (    
        <LandingContainer>
            <div className="flex items-center jusify-center w-96 mx-auto">
                <Image src="/icons/icon-192.png" alt="Logo" width={100} height={100} />
                
            </div>
        </LandingContainer>
    )
} 