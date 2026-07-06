// app/app/caregroup/[id]/case/[caseId]/informations/page.tsx

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { payloadREST } from "@/lib/payloadRest";

import PageSummary from "@/components/ui/PageSummary";

import DotsMenu from "@/components/ui/DotsMenu";

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

async function createCaseInformation(formData: FormData) {
    "use server";

    const caseId = String(formData.get("case") ?? "");
    const careGroupId = String(formData.get("careGroup") ?? "");
    const category = String(formData.get("category") ?? "");
    const title = String(formData.get("title") ?? "");
    const subtitle = String(formData.get("subtitle") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const notes = String(formData.get("notes") ?? "");

    if (!caseId || !careGroupId || !title) return;

    const user = await requireUser();

    // Vérifier que l'utilisateur a un rôle autorisé dans ce caregroup
    const membership = await payloadREST<{ docs: { role?: string }[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupId)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role || role === "patient") return;

    await payloadREST("/api/case-informations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            case: caseId,
            ...(category ? { category } : {}),
            title,
            ...(subtitle ? { subtitle } : {}),
            ...(phone ? { phone } : {}),
            ...(notes ? { notes } : {}),
        }),
    });

    revalidatePath(`/app/caregroup/${careGroupId}/case/${caseId}/informations`);
}

async function deleteCaseInformation(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    const caseId = String(formData.get("case") ?? "");
    const careGroupId = String(formData.get("careGroup") ?? "");

    if (!id || !caseId || !careGroupId) return;

    const user = await requireUser();

    const membership = await payloadREST<{ docs: { role?: string }[] }>(
        `/api/memberships?where[user][equals]=${encodeURIComponent(user.id)}&where[careGroup][equals]=${encodeURIComponent(careGroupId)}&limit=1&depth=0`,
    ).then((r) => r.docs[0]);

    const role = membership?.role;
    if (!role || role === "patient") return;

    await payloadREST(`/api/case-informations/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });

    revalidatePath(`/app/caregroup/${careGroupId}/case/${caseId}/informations`);
    revalidatePath(`/app/caregroup/${careGroupId}/case/${caseId}`);
}

export default async function CaseInformationsPage({
    params,
}: {
    params: Promise<{ id: string; caseId: string }>;
}) {
    const { id, caseId } = await params;

    await requireUser();

    const informations = await payloadREST<{ docs: CaseInformation[] }>(
        `/api/case-informations?where[case][equals]=${encodeURIComponent(caseId)}&limit=100&depth=0`,
    );

    return (
        <div className="flex flex-col gap-4">
            <PageSummary
                title="Informations"
                items={[]}
                extraAction={
                    <button
                        type="submit"
                        form="add-info-form"
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Enregistrer
                    </button>
                }
            />

            {/* Liste des informations */}
            <div className="flex flex-col gap-2">
                <h2 className="text-base font-bold">Liste des Informations</h2>
                {informations.docs.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                        Aucune information enregistrée.
                    </div>
                ) : (
                    informations.docs.map((info) => (
                        <div
                            key={info.id}
                            className="rounded-2xl border border-border bg-card p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs font-medium text-primary">
                                        {info.category
                                            ? categoryLabels[info.category] ?? info.category
                                            : "Autre"}
                                    </div>
                                    <div className="text-base font-bold">
                                        {info.title ?? "Sans titre"}
                                    </div>
                                    {info.subtitle && (
                                        <div className="text-sm text-muted">
                                            {info.subtitle}
                                        </div>
                                    )}
                                    {info.phone && (
                                        <div className="text-sm text-muted">
                                            📞 {info.phone}
                                        </div>
                                    )}
                                    {info.notes && (
                                        <div className="mt-2 text-sm text-muted">
                                            {info.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-start">
                                    <DotsMenu>
                                        <Link
                                            href={`/app/caregroup/${id}/case/${caseId}/informations/${info.id}/edit`}
                                            className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-accent"
                                        >
                                            Modifier
                                        </Link>
                                        <form action={deleteCaseInformation}>
                                            <input type="hidden" name="id" value={info.id} />
                                            <input type="hidden" name="case" value={caseId} />
                                            <input type="hidden" name="careGroup" value={id} />
                                            <button
                                                type="submit"
                                                className="w-full px-4 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                                            >
                                                Supprimer
                                            </button>
                                        </form>
                                    </DotsMenu>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Formulaire d'ajout */}
            <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-base font-bold mb-3">Ajouter une information</h2>
                <form id="add-info-form" action={createCaseInformation} className="flex flex-col gap-3">
                    <input type="hidden" name="case" value={caseId} />
                    <input type="hidden" name="careGroup" value={id} />

                    <div>
                        <label className="text-xs text-muted">Titre *</label>
                        <input
                            type="text"
                            name="title"
                            required
                            className="input w-full"
                            placeholder="ex: Médecin traitant"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Sous-titre</label>
                        <input
                            type="text"
                            name="subtitle"
                            className="input w-full"
                            placeholder="ex: Dr Martin"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Téléphone</label>
                        <input
                            type="text"
                            name="phone"
                            className="input w-full"
                            placeholder="01 XX XX XX XX"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted">Notes</label>
                        <textarea
                            name="notes"
                            className="input w-full min-h-20"
                            placeholder="Adresse, infos complémentaires..."
                        />
                    </div>

                </form>
            </div>
        </div>
    );
}