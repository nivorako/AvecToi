import type { Metadata } from "next";

import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FaqSection } from "@/components/landing/FaqSection";

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
        <main className="flex flex-col">
            <HeroSection />
            <ProblemSolutionSection />
            <FeaturesSection />
            <TestimonialsSection />
            <CtaSection />
            <FaqSection />
        </main>
    );
}