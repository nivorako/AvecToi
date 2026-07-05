"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";

type InviteState =
    | {
          ok: true;
          message: string;
      }
    | {
          ok: false;
          message: string;
      }
    | null;

export function InviteMemberForm({
    careGroupID,
    action,
}: {
    careGroupID: string;
    action: (
        prevState: InviteState,
        formData: FormData,
    ) => Promise<InviteState>;
}) {
    const [state, formAction, pending] = useActionState(action, null);

    return (
        <form action={formAction} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="careGroup" value={careGroupID} />

            <input
                name="email"
                type="email"
                placeholder="Email de l'utilisateur"
                className="input"
                required
            />

            <select name="role" className="input" defaultValue="family">
                <option value="family">Famille</option>
                <option value="professional">Professionnel</option>
                <option value="patient">Patient</option>
            </select>

            <Button type="submit" variant="primary" size="md" disabled={pending}>
                Inviter
            </Button>

            {state?.message ? (
                <div className="text-sm text-muted">{state.message}</div>
            ) : null}
        </form>
    );
}
