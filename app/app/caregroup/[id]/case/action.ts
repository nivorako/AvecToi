"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

export async function archiveCase(formData: FormData) {
    const caseID = String(formData.get("case") ?? "");
    const careGroup = String(formData.get("careGroup") ?? "");
    if (!caseID || !careGroup) return;

    const user = await requireUser();
    const membership = await payloadREST<{ docs: { role?: string }[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (membership?.role !== "owner") return;

    await payloadREST(`/api/cases/${encodeURIComponent(caseID)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
    });

    revalidatePath(`/app/caregroup/${careGroup}/cases`);
}

export async function deleteCase(formData: FormData) {
    const caseID = String(formData.get("case") ?? "");
    const careGroup = String(formData.get("careGroup") ?? "");
    if (!caseID || !careGroup) return;

    const user = await requireUser();
    const membership = await payloadREST<{ docs: { role?: string }[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroup)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    if (membership?.role !== "owner") return;

    await payloadREST(`/api/cases/${encodeURIComponent(caseID)}`, {
        method: "DELETE",
    });

    const { redirect } = await import("next/navigation");
    redirect(`/app/caregroup/${careGroup}/cases`);
}