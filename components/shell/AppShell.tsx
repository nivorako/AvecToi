import type { ReactNode } from "react";

export default function AppShell({
    header,
    footer,
    children,
}: {
    header?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            {header ? (
                <div className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
                    {header}
                </div>
            ) : null}

            <main className={footer ? "pb-24" : undefined}>{children}</main>

            {footer ? (
                <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
                    {footer}
                </div>
            ) : null}
        </div>
    );
}
