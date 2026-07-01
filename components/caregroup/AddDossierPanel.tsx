"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

export default function AddDossierPanel({
    careGroupId,
    action,
}: {
    careGroupId: string;
    action: (formData: FormData) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex justify-center">
            {!open ? (
                <Button
                    type="button"
                    size="md"
                    className="bg-primary text-white hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-semibold"
                    onClick={() => setOpen(true)}
                >
                    Ajouter dossier
                </Button>
            ) : (
                <div className="w-full rounded-2xl border border-border bg-card p-4">
                    <form action={action} className="flex flex-col gap-2">
                        <input
                            type="hidden"
                            name="careGroup"
                            value={careGroupId}
                        />
                        <input
                            name="title"
                            placeholder="Titre"
                            className="input"
                            required
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <select
                                name="type"
                                className="input"
                                required
                                defaultValue="medical"
                            >
                                <option value="medical">Medical</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full sm:w-auto"
                            >
                                Enregistrer
                            </Button>
                            <Button
                                variant="secondary"
                                type="button"
                                size="lg"
                                className="w-full sm:w-auto"
                                onClick={() => setOpen(false)}
                            >
                                Annuler
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
