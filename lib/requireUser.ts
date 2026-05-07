import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/payloadRest";

export async function requireUser() {
    // Server-side auth guard used by protected pages.
    //
    // Behavior:
    // - If the user is not authenticated, we redirect to /login.
    // - Otherwise we return the current user object from Payload (/api/users/me).
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
}
