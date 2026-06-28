"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    taskID: string;
    initialDescription?: string;
    canEdit?: boolean;
};

export default function TaskDescriptionEditor({
    taskID,
    initialDescription = "",
    canEdit = false,
}: Props) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(initialDescription);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/tasks/${taskID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: value }),
            });
            if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
            setEditing(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue");
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <div className="flex flex-col gap-2">
                {value ? (
                    <p className="whitespace-pre-wrap text-sm">{value}</p>
                ) : (
                    <p className="text-sm text-muted">Aucune description.</p>
                )}
                {canEdit && (
                    <button
                        type="button"
                        className="btn-secondary w-fit text-sm"
                        onClick={() => setEditing(true)}
                    >
                        {value ? "Modifier" : "Ajouter une description"}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <textarea
                className="input min-h-28"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Décrivez la tâche..."
                autoFocus
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
                <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => { setEditing(false); setValue(initialDescription); }}
                    disabled={saving}
                >
                    Annuler
                </button>
            </div>
        </div>
    );
}