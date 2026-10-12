
import type { PayloadRequest } from "payload";

import type { Role } from "@/domain/roles";

type AcceptInvitationInput = {
    token: string;
    email: string;
    password: string;
};

type AcceptInvitationResult = {
    userId: string | number;
    membershipId: string | number;
    invitationId: string | number;
};

function getRelationshipID(
    value:
        | string
        | number
        | { id?: string | number }
        | null
        | undefined,
): string | number | undefined {
    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return value;
    }

    return value?.id;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export async function acceptInvitation(
    req: PayloadRequest,
    input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
    // ------------------------------------------------------------
    // 1. Validation minimale de l'entrée
    // ------------------------------------------------------------

    const token = input.token?.trim();
    const email = normalizeEmail(input.email ?? "");
    const password = input.password ?? "";

    if (!token) {
        throw new Error("Le token d'invitation est requis.");
    }

    if (!email) {
        throw new Error("L'adresse email est requise.");
    }

    if (!password) {
        throw new Error("Le mot de passe est requis.");
    }

    // ------------------------------------------------------------
    // 2. Invitation
    // ------------------------------------------------------------

    const invitationResult = await req.payload.find({
        collection: "invitations",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            token: {
                equals: token,
            },
        },
        req,
        overrideAccess: true,
    });

    const invitation = invitationResult.docs[0];

    if (!invitation) {
        throw new Error("Invitation introuvable.");
    }

    if (invitation.status !== "pending") {
        throw new Error(
            "Cette invitation n'est plus en attente.",
        );
    }

    if (
        !invitation.expiresAt ||
        new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
        throw new Error("Cette invitation a expiré.");
    }

    const invitationEmail = normalizeEmail(
        invitation.email,
    );

    if (email !== invitationEmail) {
        throw new Error(
            "L'adresse email ne correspond pas à l'invitation.",
        );
    }

    // ------------------------------------------------------------
    // 3. Contexte dérivé exclusivement de l'invitation
    // ------------------------------------------------------------

    const role = invitation.role as Role;

    const careGroupID = getRelationshipID(
        invitation.careGroup,
    );

    const patientID = getRelationshipID(
        invitation.patient,
    );

    if (!careGroupID) {
        throw new Error(
            "L'invitation n'est associée à aucun CareGroup.",
        );
    }

    // ------------------------------------------------------------
    // 4. Vérifications spécifiques au rôle patient
    // ------------------------------------------------------------

    let patient:
        | Awaited<
              ReturnType<typeof req.payload.findByID>
          >
        | undefined;

    if (role === "patient") {
        if (!patientID) {
            throw new Error(
                "Une invitation patient doit être associée à un Patient.",
            );
        }

        patient = await req.payload.findByID({
            collection: "patients",
            id: patientID,
            depth: 0,
            req,
            overrideAccess: true,
        });

        if (!patient) {
            throw new Error(
                "Le Patient associé à l'invitation est introuvable.",
            );
        }

        const patientCareGroupID = getRelationshipID(
            patient.careGroup,
        );

        if (
            !patientCareGroupID ||
            String(patientCareGroupID) !==
                String(careGroupID)
        ) {
            throw new Error(
                "Le Patient n'appartient pas au CareGroup de l'invitation.",
            );
        }

        if (patient.user) {
            throw new Error(
                "Ce Patient possède déjà un compte utilisateur.",
            );
        }
    }

    // ------------------------------------------------------------
    // 5. User
    // ------------------------------------------------------------

    const existingUsers = await req.payload.find({
        collection: "users",
        depth: 0,
        limit: 1,
        pagination: false,
        where: {
            email: {
                equals: email,
            },
        },
        req,
        overrideAccess: true,
    });

    let user = existingUsers.docs[0];

    if (!user) {
            // ---------------------------------------------------------
            // Aucun User existant :
            // créer le compte avec le mot de passe fourni.
            // ---------------------------------------------------------
        user = await req.payload.create({
            collection: "users",
            data: {
                email,
                password,
            },
            req,
            overrideAccess: true,
        });
    } else {
        // ---------------------------------------------------------
        // User existant :
        // le mot de passe fourni doit authentifier ce compte.
        // ---------------------------------------------------------
         const loginResult = await req.payload.login({
            collection: "users",
            data: {
                email,
                password,
            },
            req,
        });

        if (!loginResult.user) {
            throw new Error("Utilisateur absent du résultat de connexion.");
        }

        user = loginResult.user;
    }

    // Contrôle patient afin d'éviter la création de compte utilisateur pour un patient déjà existant
    if (role === "patient") {
        const existingPatientForUser =
            await req.payload.find({
                collection: "patients",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    user: {
                        equals: user.id,
                    },
                },
                req,
                overrideAccess: true,
            });

        if (existingPatientForUser.docs.length) {
            throw new Error(
                "Ce compte utilisateur est déjà associé à un Patient.",
            );
        }
    }

    // ------------------------------------------------------------
    // 6. Membership
    // ------------------------------------------------------------

    const existingMemberships =
        await req.payload.find({
            collection: "memberships",
            depth: 0,
            limit: 1,
            pagination: false,
            where: {
                and: [
                    {
                        user: {
                            equals: user.id,
                        },
                    },
                    {
                        careGroup: {
                            equals: careGroupID,
                        },
                    },
                ],
            },
            req,
            overrideAccess: true,
        });

    let membership = existingMemberships.docs[0];

    if (membership) {
        if (membership.role !== role) {
            throw new Error(
                "Cet utilisateur possède déjà un rôle différent dans ce CareGroup.",
            );
        }
    } else {
        membership = await req.payload.create({
            collection: "memberships",
            data: {
                user: user.id,
                careGroup: careGroupID,
                role,
            },
            req,
            overrideAccess: true,
        });
    }

    // ------------------------------------------------------------
    // 7. Association Patient → User
    // ------------------------------------------------------------

    if (role === "patient") {
        if (!patientID) {
            throw new Error(
                "Le Patient est requis pour une invitation patient.",
            );
        }

        /*
         * Mise à jour conditionnelle :
         *
         * le Patient doit toujours avoir user absent ou null.
         *
         * Si une autre acceptation concurrente a déjà associé
         * le Patient à un User, cette opération ne retournera
         * aucun document.
         * 
         * L'association Patient.user est réalisée par le service 
         * serveur d'acceptation d'une invitation patient. ( context )
         */
        const patientUpdateResult =
            await req.payload.update({
                collection: "patients",
                where: {
                    and: [
                        {
                            id: {
                                equals: patientID,
                            },
                        },
                        {
                            or: [
                                {   
                                    user: {
                                        exists: false,
                                    },
                                },
                                {
                                    user: {
                                        equals: null,
                                    },
                                },
                            ],
                        },
                    ],
                },
                data: {
                    user: user.id,
                },
                req,
                overrideAccess: true,
                context: {
                    invitationAcceptance: true,
                },
            });

        if (patientUpdateResult.docs.length !== 1) {
            throw new Error(
                "Le Patient a déjà été associé à un compte utilisateur.",
            );
        }
    }

    // ------------------------------------------------------------
    // 8. Acceptation conditionnelle de l'invitation
    // ------------------------------------------------------------

    const invitationUpdateResult =
        await req.payload.update({
            collection: "invitations",
            where: {
                and: [
                    {
                        id: {
                            equals: invitation.id,
                        },
                    },
                    {
                        status: {
                            equals: "pending",
                        },
                    },
                    {
                        expiresAt: {
                            greater_than: new Date().toISOString(),
                        },
                    },
                ],
            },
            data: {
                status: "accepted",
            },
            req,
            overrideAccess: true,
        });

    if (invitationUpdateResult.docs.length !== 1) {
        throw new Error(
            "L'invitation n'est plus disponible pour acceptation.",
        );
    }

    // ------------------------------------------------------------
    // 9. Résultat
    // ------------------------------------------------------------

    return {
        userId: user.id,
        membershipId: membership.id,
        invitationId: invitation.id,
    };
}

