"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type BreadcrumbLabels = Record<string, string>;

const BreadcrumbContext = createContext<{
    labels: BreadcrumbLabels;
    setLabels: React.Dispatch<React.SetStateAction<BreadcrumbLabels>>;
}>({ labels: {}, setLabels: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [labels, setLabels] = useState<BreadcrumbLabels>({});
    return (
        <BreadcrumbContext.Provider value={{ labels, setLabels }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumb() {
    return useContext(BreadcrumbContext);
}