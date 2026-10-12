import type { PayloadRequest } from "payload";

import type { Permission } from "@/domain/permissions";
import type { Role } from "@/domain/roles";
import { hasPermission } from "./hasPermission";

type CanAccessCaseArgs = {
    req: PayloadRequest;
    caseId: string | number;
    permission: Permission;
};

export async function canAccessCase({
    req,
    caseId,
    permission,
}: CanAccessCaseArgs): Promise<boolean> {
    if (!req.user) return false;

    const userRole = req.user.role as Role;

    // 1. Vérification de la permission du rôle
    if (!hasPermission(userRole, permission)) {
        return false;
    }

    // 2. Récupération du dossier
    const caseDoc = await req.payload.findByID({
        collection: "cases",
        id: caseId,
        depth: 0,
    });

    if (!caseDoc?.careGroup) {
        return false;
    }

    const careGroupID =
        typeof caseDoc.careGroup === "string" ||
        typeof caseDoc.careGroup === "number"
            ? caseDoc.careGroup
            : caseDoc.careGroup.id;

    // 3. Vérification de l'appartenance au CareGroup
    const membership = await req.payload.find({
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

    if (!membership.docs.length) {
        return false;
    }

    const role = membership.docs[0].role as Role;

    // 4. Règles métier liées au type de dossier
    if (role === "professional" && caseDoc.type !== "medical") {
        return false;
    }

    // 5. Patient : lecture uniquement
    if (
        role === "patient" &&
        !["cases.read"].includes(permission)
    ) {
        return false;
    }

    return true;
}