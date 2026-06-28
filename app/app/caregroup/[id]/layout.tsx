import type { ReactNode } from "react";

import SetBreadcrumb from "@/components/shell/SetBreadcrumb";
import { payloadREST } from "@/lib/payloadRest";

type CareGroup = {
    id: string;
    name?: string;
};

export default async function CareGroupLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const careGroup = await payloadREST<CareGroup>(`/api/caregroups/${id}?depth=0`);

    return (
        <>
            <SetBreadcrumb labels={{ [id]: careGroup?.name ?? id }} />
            {children}
        </>
    );
}