import type { ReactNode } from "react";

import SetBreadcrumb from "@/components/shell/SetBreadcrumb";
import { payloadREST } from "@/lib/payloadRest";

type CaseDoc = {
    id: string;
    title?: string;
};

export default async function CaseLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string; caseId: string }>;
}) {
    const { caseId } = await params;
    const caseDoc = await payloadREST<CaseDoc>(`/api/cases/${caseId}?depth=0`);

    return (
        <>
            <SetBreadcrumb labels={{ [caseId]: caseDoc?.title ?? caseId }} />
            {children}
        </>
    );
}