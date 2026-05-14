"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

export default function AddTaskPanel({
    careGroupId,
    defaultCaseId,
    cases,
    action,
}: {
    careGroupId: string;
    defaultCaseId: string;
    cases: Array<{ id: string; title?: string }>;
    action: (formData: FormData) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-4 flex justify-center">
            {!open ? (
                <Button
                    type="button"
                    size="lg"
                    className="w-full max-w-xs"
                    onClick={() => setOpen(true)}
                >
                    Ajouter une tâche
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
                        <input
                            name="responsable"
                            placeholder="Responsable (optionnel)"
                            className="input"
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <select
                                name="case"
                                className="input"
                                required
                                defaultValue={defaultCaseId}
                            >
                                {cases.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.title ?? c.id}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                name="dueDate"
                                className="input"
                            />
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
