"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/components/shell/BreadcrumContext";

export default function SetBreadcrumb({ labels }: { labels: Record<string, string> }) {
    const { setLabels } = useBreadcrumb();
    useEffect(() => {
        setLabels((prev) => ({ ...prev, ...labels }));
        return () => {
            setLabels((prev) => {
                const next = { ...prev };
                for (const key of Object.keys(labels)) {
                    delete next[key];
                }
                return next;
            });
        };
    }, [labels]);
    return null;
}