import type { ReactNode } from "react";

import AppShell from "@/components/shell/AppShell";
import BottomNav from "@/components/shell/BottomNav";
import TopBar from "@/components/shell/TopBar";
import UserMenu from "@/components/shell/UserMenu";
import { requireUser } from "@/lib/requireUser";

export default async function AppLayout({ children }: { children: ReactNode }) {
    await requireUser();

    return (
        <AppShell
            header={
                <TopBar
                    left={
                        <a
                            href="/app"
                            className="text-sm font-semibold text-primary"
                        >
                            AvecToi
                        </a>
                    }
                    right={
                        <div className="flex items-center gap-2">
                            <UserMenu />
                        </div>
                    }
                />
            }
            footer={<BottomNav />}
        >
            <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
        </AppShell>
    );
}
