import type { PayloadRequest } from "payload";

import type { Permission } from "@/domain/permissions";
import type { Role } from "@/domain/roles";
import { hasPermission } from "./hasPermission";

type CanAccessPatientArgs = {
    req: PayloadRequest;
    patientId: string | number;
    permission: Permission;
};

export async function canAccessPatient({
    req,
    patientId,
    permission,
}: CanAccessPatientArgs): Promise<boolean> {
    // -------------------------------------------------------------
    // 1. Utilisateur authentifié
    // -------------------------------------------------------------
    if (!req.user) return false;

    // -------------------------------------------------------------
    // 2. Récupérer le Patient
    // -------------------------------------------------------------
    const patient = await req.payload.findByID({
        collection: "patients",
        id: patientId,
        depth: 0,
    });

    if (!patient) return false;

    // -------------------------------------------------------------
    // 3. Le Patient doit appartenir à un CareGroup
    // -------------------------------------------------------------
    if (!patient.careGroup) return false;

    const careGroupID =
        typeof patient.careGroup === "string" ||
        typeof patient.careGroup === "number"
            ? patient.careGroup
            : patient.careGroup.id;

    if (!careGroupID) return false;

    // -------------------------------------------------------------
    // 4. Trouver la Membership de l'utilisateur
    //    dans le CareGroup du Patient
    // -------------------------------------------------------------
    const memberships = await req.payload.find({
        collection: "memberships",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            and: [
                {
                    user: {
                        equals: req.user.id,
                    },
                },
                {
                    careGroup: {
                        equals: careGroupID,
                    },
                },
            ],
        },
    });

    const membership = memberships.docs[0];

    if (!membership) return false;

    // -------------------------------------------------------------
    // 5. Le rôle est porté par la Membership
    // -------------------------------------------------------------
    const role = membership.role as Role;

    // -------------------------------------------------------------
    // 6. Vérifier que le rôle possède la permission demandée
    // -------------------------------------------------------------
    if (!hasPermission(role, permission)) {
        return false;
    }

    // -------------------------------------------------------------
    // 7. Le rôle "patient" est strictement limité à SON Patient
    // -------------------------------------------------------------
    if (role === "patient") {
        // Le Patient doit avoir un User associé.
        if (!patient.user) return false;

        const patientUserID =
            typeof patient.user === "string" ||
            typeof patient.user === "number"
                ? patient.user
                : patient.user.id;

        // Le User connecté doit être celui associé au Patient.
        if (patientUserID !== req.user.id) {
            return false;
        }

        // Le Patient est en lecture seule.
        if (permission !== "patients.read") {
            return false;
        }
    }

    // -------------------------------------------------------------
    // 8. Accès autorisé
    // -------------------------------------------------------------
    return true;
}