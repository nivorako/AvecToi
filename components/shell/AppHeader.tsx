import TopBar from "@/components/shell/TopBar";

function getFirstName(name?: string | null): string {
    if (!name) return "vous";
    return name.split(" ")[0];
}

function getInitial(name?: string | null): string {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
}

export default function AppHeader({ userName }: { userName?: string | null }) {
    const firstName = getFirstName(userName);
    const initial = getInitial(userName);

    return (
        <TopBar
            left={
                <div className="flex flex-col items-left gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {initial}
                    </div>
                    <span className="text-base font-semibold">
                        Bonjour, {firstName} 👋
                    </span>
                </div>
            }
            right={
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                    >
                        🔔
                    </button>
                    <button
                        type="button"
                        aria-label="Paramètres"
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                    >
                        ⚙️
                    </button>
                </div>
            }
        />
    );
}