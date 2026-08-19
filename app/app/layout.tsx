import type { ReactNode } from "react";

import AppShell from "@/components/shell/AppShell";
import AppHeader from "@/components/shell/AppHeader";
import { BreadcrumbProvider } from "@/components/shell/BreadcrumContext";
import BottomNav from "@/components/shell/BottomNav";
import { requireUser } from "@/lib/requireUser";

import "../../styles/globals.css";

export default async function AppLayout({ children }: { children: ReactNode }) {

    const user = await requireUser();

    return (
        <BreadcrumbProvider>
            <AppShell
                header={<AppHeader userName={user.name} />}
                footer={<BottomNav />}
            >
                <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
            </AppShell>
        </BreadcrumbProvider>
        );
}
