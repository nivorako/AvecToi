import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/sections/HeroSection";
import { ProblemSection } from "@/components/landing/sections/ProblemSection";
import { SolutionSection } from "@/components/landing/sections/SolutionSection";
import { AppOverviewSection } from "@/components/landing/sections/AppOverviewSection";
import { BenefitsSection } from "@/components/landing/sections/BenefitsSection";
import { SecuritySection } from "@/components/landing/sections/SecuritySection";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";


export const metadata: Metadata = {
    title: "Avec Toi – Coordination de soins pour aidants familiaux",
    description: "Centralisez les dossiers médicaux, tâches et communications autour de votre proche. Simple, sécurisé, gratuit pour les familles.",
    openGraph: {
        title: "Avec Toi – Coordination de soins pour aidants familiaux",
        description: "Centralisez les dossiers médicaux, tâches et communications autour de votre proche.",
        url: "https://avec-toi-hazel.vercel.app/",
        images: [{ url: "/og-home.png", width: 1200, height: 630 }],
    },
    alternates: {
        canonical: "https://avec-toi-hazel.vercel.app/",
    },
};

export default function LandingPage() {
    return (
        <>
            <HeroSection />
            <ProblemSection />
            <SolutionSection />
            <AppOverviewSection /> 
            <BenefitsSection />
            <SecuritySection />
            <FinalCtaSection />
        </>
    );
};
