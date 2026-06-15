import type { ReactNode } from "react";
import Link from "next/link";

import Badge from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";

type CaseStatus = "action" | "ok" | "urgent";

type Props = {
    title: string;
    subtitle?: string;
    category: string;
    categoryIcon: ReactNode;
    status: CaseStatus;
    meta: string;
    lastActivity: string;
    href: string;
};

const statusConfig: Record<CaseStatus, { label: string; variant: BadgeVariant }> = {
    action: { label: "Action", variant: "warning" },
    ok:     { label: "À jour", variant: "success" },
    urgent: { label: "Urgent", variant: "danger" },
};

export default function CaseSummaryCard({
    title,
    subtitle,
    category,
    categoryIcon,
    status,
    meta,
    lastActivity,
    href,
}: Props) {
    const { label, variant } = statusConfig[status];

    return (
        <Link
            href={href}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 hover:bg-card/70 gap-3"
        >
            <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    {categoryIcon}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{category}</span>
                        <Badge variant={variant}>{label}</Badge>
                    </div>
                    {subtitle && (
                        <div className="text-sm text-foreground mt-0.5">{subtitle}</div>
                    )}
                    <div className="text-xs text-muted mt-1">{meta}</div>
                    <div className="text-xs text-muted">Dernière activité : {lastActivity}</div>
                </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-muted" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
            </svg>
        </Link>
    );
}