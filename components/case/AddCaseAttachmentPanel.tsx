"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

export default function AddCaseAttachmentPanel({
    canAdd,
    children,
}: {
    canAdd: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    if (!canAdd) return null;

    return (
        <div className="mt-4 flex justify-center">
            {!open ? (
                <Button
                    type="button"
                    size="lg"
                    className="w-full max-w-xs"
                    onClick={() => setOpen(true)}
                >
                    Ajouter un document
                </Button>
            ) : (
                <div className="w-full rounded-2xl border border-border bg-card p-4">
                    {children}
                    <div className="mt-3 flex justify-center">
                        <Button
                            variant="secondary"
                            type="button"
                            size="lg"
                            className="w-full max-w-xs"
                            onClick={() => setOpen(false)}
                        >
                            Fermer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
