"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button/Button";

export function TaskAttachmentsUploader({ taskID }: { taskID: string }) {
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
        body.set("task", taskID);
        body.set("description", description);
        body.set("file", file);

        try {
            const res = await fetch(
                // Uploads are multipart. We go through a Next.js API route so the server can attach
                // Authorization from the HttpOnly `avectoi-token` cookie.
                `/api/task-attachments/upload?task=${encodeURIComponent(taskID)}`,
                {
                    method: "POST",
                    body,
                },
            );

            if (!res.ok) {
                const contentType = res.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    const json = (await res.json().catch(() => null)) as
                        | { errors?: Array<{ message?: string }> }
                        | { message?: string }
                        | null;

                    const msg =
                        (json && "errors" in json && Array.isArray(json.errors)
                            ? json.errors
                                  .map((e) => e?.message)
                                  .filter(Boolean)
                                  .join("\n")
                            : (json as { message?: string } | null)?.message) ??
                        "Upload failed";

                    throw new Error(`${res.status} ${msg}`);
                }

                const text = await res.text().catch(() => "");
                throw new Error(`${res.status} ${text || "Upload failed"}`);
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
            <Button type="submit" variant="secondary" size="md" disabled={submitting} className="self-center">
                {submitting ? "Ajout..." : "Ajouter un document"}
            </Button>
        </form>
    );
}
