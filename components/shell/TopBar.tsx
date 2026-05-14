import type { ReactNode } from "react";

export default function TopBar({
    left,
    right,
}: {
    left?: ReactNode;
    right?: ReactNode;
}) {
    return (
        <div className="flex w-full items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">{left}</div>
            <div className="flex items-center gap-2">{right}</div>
        </div>
    );
}
