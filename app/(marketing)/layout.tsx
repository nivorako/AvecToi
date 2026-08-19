import type { ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

import "../../styles/globals.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <LandingHeader />
            {children}
            <LandingFooter />
        </>
    );
}