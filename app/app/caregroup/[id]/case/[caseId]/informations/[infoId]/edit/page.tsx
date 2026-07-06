// app/app/caregroup/[id]/case/[caseId]/informations/[infoId]/edit/page.tsx

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";
import PageSummary from "@/components/ui/PageSummary";

type CaseInformation = {
    id: string;
    category?: "doctor" | "insurance" | "contact" | "other";
    title?: string;
    subtitle?: string;
    phone?: string;
    notes?: string;
};

const categoryLabels: Record<string, string> = {
    doctor: "Médecin",
    insurance: "Mutuelle / Assurance",
    contact: "Contact",
    other: "Autre",
};

async function updateCaseInformation(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const caseId = String(formData.get("case") ?? "");
    const careGroupId = String(formData.get("careGroup") ?? "");
    const category = String(formData.get("category") ?? "");
    const title = String(formData.get("title") ?? "");
    const subtitle = String(formData.get("subtitle") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const notes = String(formData.get("notes") ?? "");

    if (!id || !caseId || !careGroupId || !title) return;

    const user = await requireUser();

    const membership = await payloadREST<{ docs: { role?: string }[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupId)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role || role === "patient") return;

    await payloadREST(`/api/case-informations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            category,
            title,
            subtitle,
            phone,
            notes,
        }),
    });

    revalidatePath(`/app/caregroup/${careGroupId}/case/${caseId}/informations`);
    revalidatePath(`/app/caregroup/${careGroupId}/case/${caseId}`);

    redirect(`/app/caregroup/${careGroupId}/case/${caseId}/informations`);
}

export default async function EditCaseInformationPage({
    params,
}: {
    params: Promise<{ id: string; caseId: string; infoId: string }>;
}) {
    const { id, caseId, infoId } = await params;

    await requireUser();

    const info = await payloadREST<CaseInformation>(
        `/api/case-informations/${encodeURIComponent(infoId)}?depth=0`,
    );

    if (!info || !info.id) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-4">
            <PageSummary
                title="Modifier l'information"
                items={[]}
                extraAction={
                    <button
                        type="submit"
                        form="add-info-form"
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Enregistrer les modifications
                    </button>
                }
            />

            <div className="rounded-2xl border border-border bg-card p-4">
                <form id="add-info-form" action={updateCaseInformation} className="flex flex-col gap-3">
                    <input type="hidden" name="id" value={info.id} />
                    <input type="hidden" name="case" value={caseId} />
                    <input type="hidden" name="careGroup" value={id} />

                    <div>
                        <label className="text-xs text-muted">Catégorie</label>
                        <select
                            name="category"
                            defaultValue={info.category ?? "other"}
                            className="input w-full"
                        >
                            <option value="doctor">{categoryLabels.doctor}</option>
                            <option value="insurance">{categoryLabels.insurance}</option>
                            <option value="contact">{categoryLabels.contact}</option>
                            <option value="other">{categoryLabels.other}</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-muted">Titre *</label>
                        <input
                            type="text"
                            name="title"
                            required
                            defaultValue={info.title ?? ""}
                            className="input w-full"
                            placeholder="ex: Médecin traitant"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Sous-titre</label>
                        <input
                            type="text"
                            name="subtitle"
                            defaultValue={info.subtitle ?? ""}
                            className="input w-full"
                            placeholder="ex: Dr Martin"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Téléphone</label>
                        <input
                            type="text"
                            name="phone"
                            defaultValue={info.phone ?? ""}
                            className="input w-full"
                            placeholder="01 XX XX XX XX"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Notes</label>
                        <textarea
                            name="notes"
                            defaultValue={info.notes ?? ""}
                            className="input w-full min-h-20"
                            placeholder="Adresse, infos complémentaires..."
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
