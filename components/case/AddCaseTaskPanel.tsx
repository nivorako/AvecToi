"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

export default function AddCaseTaskPanel({
    careGroupId,
    caseId,
    caseType,
    action,
    users,
}: {
    careGroupId: string;
    caseId: string;
    caseType: string;
    action: (formData: FormData) => Promise<void>;
    users: Array<{ id: string; name?: string }>;
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
                        <input type="hidden" name="case" value={caseId} />
                        <input
                            type="hidden"
                            name="careGroup"
                            value={careGroupId}
                        />
                        <input type="hidden" name="caseType" value={caseType} />
                        <input
                            name="title"
                            placeholder="Titre"
                            className="input"
                            required
                        />

                        <select name="assignedTo" className="input">
                            <option value="">Non assigné</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name || u.id}
                                </option>
                            ))}
                        </select>

                        <input type="date" name="dueDate" className="input" />
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
