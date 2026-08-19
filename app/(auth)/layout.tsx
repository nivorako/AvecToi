import type { ReactNode } from "react";
import { AuthHeader } from "@/components/landing/AuthHeader";
import { AuthFooter } from "@/components/landing/AuthFooter";

import "../../styles/globals.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <AuthHeader />

            <main className="flex flex-1 items-center justify-center">
                {children}
            </main>

            <AuthFooter />
        </div>
    );
}