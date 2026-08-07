import type { ReactNode } from "react";
import { AuthHeader } from "@/components/landing/AuthHeader";
import { AuthFooter } from "@/components/landing/AuthFooter";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <AuthHeader />
            {children}
            <AuthFooter />
        </>
    );
}