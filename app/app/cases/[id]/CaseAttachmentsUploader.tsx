"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CaseAttachmentsUploader({ caseID }: { caseID: string }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!file) return;

        setSubmitting(true);
        setError(null);

        const body = new FormData();
        body.set("case", caseID);
        body.set("description", description);
        body.set("file", file);

        try {
            const res = await fetch(
                `/api/case-attachments?case=${encodeURIComponent(caseID)}`,
                {
                    method: "POST",
                    body,
                },
            );

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `Upload failed: ${res.status}`);
            }

            setFile(null);
            setDescription("");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
            <input
                type="file"
                name="file"
                className="input"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <textarea
                name="description"
                className="input min-h-20"
                placeholder="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            {error ? <div className="text-sm text-danger">{error}</div> : null}
            <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Ajout..." : "Ajouter un document"}
            </button>
        </form>
    );
}
