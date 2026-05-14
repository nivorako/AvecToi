import type { ReactNode } from "react";
import Image from "next/image";

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
                        <a href="/app" className="block shrink-0">
                            <Image
                                src="/brand/logo-memolien.png"
                                alt="MémoLien"
                                width={180}
                                height={44}
                                priority
                                className="h-8 w-auto sm:h-9"
                            />
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
