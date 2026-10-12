import type { CollectionConfig, Where } from "payload";

import { INVITABLE_ROLE_OPTIONS } from "@/domain/roles";

export const Invitations: CollectionConfig = {
            slug: "invitations",
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    const careGroupID =
                        typeof data?.careGroup === "string" ||
                        typeof data?.careGroup === "number"
                            ? data.careGroup
                            : (data?.careGroup as { id?: string | number } | undefined)
                                ?.id;

                    if (!careGroupID) return false;

                    const role = data?.role;

                    // Une invitation Patient est un acte réservé à un admin.
                    const allowedRoles =
                        role === "patient"
                            ? ["admin"]
                            : ["admin", "family"];

                    const inviterMemberships = await req.payload.find({
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
                                {
                                    role: {
                                        in: allowedRoles,
                                    },
                                },
                            ],
                        },
                    });

                    return inviterMemberships.docs.length > 0;
                },
                read: async ({ req }) => {
                    if (!req.user) return false;

                    const adminMemberships = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 100,
                        pagination: false,
                        where: {
                            and: [
                                {
                                    user: {
                                        equals: req.user.id,
                                    },
                                },
                                {
                                    role: {
                                        equals: "admin",
                                    },
                                },
                            ],
                        },
                    });

                    const adminCareGroupIDs = adminMemberships.docs
                        .map((m) =>
                            typeof m.careGroup === "string"
                                ? m.careGroup
                                : (m.careGroup as { id?: string } | undefined)
                                      ?.id,
                        )
                        .filter((id): id is string => Boolean(id));

                    const or: Where[] = [];

                    if (req.user.email) {
                        or.push({
                            email: {
                                equals: req.user.email,
                            },
                        });
                    }

                    or.push({
                        careGroup: {
                            in: adminCareGroupIDs.length
                                ? adminCareGroupIDs
                                : ["__none__"],
                        },
                    });

                    return { or };
                },

                // qui peut modifier ??
                update: async ({ req }) => {
                    if (!req.user) return false;

                    const adminMemberships = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 100,
                            pagination: false,
                            where: {
                                and: [
                                    {
                                        user: {
                                            equals: req.user.id,
                                        },
                                    },
                                    {
                                        role: {
                                            equals: "admin",
                                        },
                                    },
                                ],
                            },
                        });

                    const careGroupIDs = adminMemberships.docs
                        .map((membership) =>
                            typeof membership.careGroup === "string" ||
                            typeof membership.careGroup === "number"
                                ? membership.careGroup
                                : membership.careGroup?.id,
                        )
                        .filter(
                            (id): id is string | number =>
                                id !== undefined && id !== null,
                        );

                    if (!careGroupIDs.length) return false;

                    return {
                        careGroup: {
                            in: careGroupIDs,
                        },
                    };
                },
            },
            fields: [
                {
                    name: "careGroup",
                    type: "relationship",
                    relationTo: "caregroups",
                    required: true,
                },
                {
                    name: "patient",
                    type: "relationship",
                    relationTo: "patients",
                    required: false,
                    admin: {
                        description:
                            "Patient concerné par l'invitation. Obligatoire uniquement pour une invitation de rôle patient.",
                    },
                },
                {
                    name: "email",
                    type: "email",
                    required: true,
                },
                {
                    name: "role",
                    type: "select",
                    required: true,
                    // Invitation role controls which membership role will be created when the invite is accepted.
                    // We support "patient" so an admin can invite a read-only patient account.
                    options: [...INVITABLE_ROLE_OPTIONS],
                },
                {
                    name: "token",
                    type: "text",
                    required: true,
                    unique: true,
                },
                {
                    name: "status",
                    type: "select",
                    required: true,
                    defaultValue: "pending",
                    options: [
                        {
                            label: "Pending",
                            value: "pending",
                        },
                        {
                            label: "Accepted",
                            value: "accepted",
                        },
                        {
                            label: "Revoked",
                            value: "revoked",
                        },
                    ],
                },
                {
                    name: "expiresAt",
                    type: "date",
                    required: true,
                },
            ],
            hooks: {
                beforeValidate: [
                    async ({ data, operation, originalDoc, req }) => {
                        if (!data) return data;

                        // =============================================================
                        // CREATE
                        // =============================================================

                        if (operation === "create") {
                            if (data.role !== "patient") {
                                return data;
                            }

                            // ---------------------------------------------------------
                            // 1. Patient obligatoire pour une invitation patient
                            // ---------------------------------------------------------

                            if (!data.patient) {
                                throw new Error(
                                    "Une invitation de rôle patient doit être liée à un Patient.",
                                );
                            }

                            const patientID =
                                typeof data.patient === "string" ||
                                typeof data.patient === "number"
                                    ? data.patient
                                    : data.patient.id;

                            if (!patientID) {
                                throw new Error(
                                    "Le Patient associé à l'invitation est invalide.",
                                );
                            }

                            const patient = await req.payload.findByID({
                                collection: "patients",
                                id: patientID,
                                depth: 0,
                            });

                            if (!patient) {
                                throw new Error(
                                    "Le Patient associé à l'invitation n'existe pas.",
                                );
                            }

                            // ---------------------------------------------------------
                            // 2. Même CareGroup
                            // ---------------------------------------------------------

                            const invitationCareGroupID =
                                typeof data.careGroup === "string" ||
                                typeof data.careGroup === "number"
                                    ? data.careGroup
                                    : data.careGroup?.id;

                            const patientCareGroupID =
                                typeof patient.careGroup === "string" ||
                                typeof patient.careGroup === "number"
                                    ? patient.careGroup
                                    : patient.careGroup?.id;

                            if (
                                !invitationCareGroupID ||
                                !patientCareGroupID ||
                                String(invitationCareGroupID) !==
                                    String(patientCareGroupID)
                            ) {
                                throw new Error(
                                    "Le Patient doit appartenir au même CareGroup que l'invitation.",
                                );
                            }

                            // ---------------------------------------------------------
                            // 3. Patient ne doit pas déjà avoir de User
                            // ---------------------------------------------------------

                            if (patient.user) {
                                throw new Error(
                                    "Ce Patient possède déjà un compte utilisateur.",
                                );
                            }

                            // ---------------------------------------------------------
                            // 4. Un seul pending par Patient
                            // ---------------------------------------------------------

                            const existingPendingInvitations =
                                await req.payload.find({
                                    collection: "invitations",
                                    depth: 0,
                                    limit: 1,
                                    pagination: false,
                                    where: {
                                        and: [
                                            {
                                                patient: {
                                                    equals: patientID,
                                                },
                                            },
                                            {
                                                status: {
                                                    equals: "pending",
                                                },
                                            },
                                        ],
                                    },
                                });

                            if (existingPendingInvitations.docs.length > 0) {
                                throw new Error(
                                    "Une invitation en attente existe déjà pour ce Patient.",
                                );
                            }

                            return data;
                        }

                        // =============================================================
                        // UPDATE : que peut on modifier ??
                        // =============================================================

                        if (operation === "update") {
                            // -------------------------------------------------------------
                            // Les données structurelles d'une invitation sont immuables.
                            // -------------------------------------------------------------

                            const immutableFields = [
                                "careGroup",
                                "email",
                                "role",
                                "patient",
                                "token",
                                "expiresAt",
                            ] as const;

                            for (const field of immutableFields) {
                                if (data[field] === undefined) continue;

                                const previousValue = originalDoc?.[field];

                                // Relations Payload : comparer les IDs
                                if (
                                    field === "careGroup" ||
                                    field === "patient"
                                ) {
                                    const previousID =
                                        typeof previousValue === "string" ||
                                        typeof previousValue === "number"
                                            ? previousValue
                                            : previousValue?.id;

                                    const nextID =
                                        typeof data[field] === "string" ||
                                        typeof data[field] === "number"
                                            ? data[field]
                                            : data[field]?.id;

                                    if (String(nextID) !== String(previousID)) {
                                        throw new Error(
                                            `Le champ "${field}" ne peut pas être modifié après création.`,
                                        );
                                    }

                                    continue;
                                }

                                if (data[field] !== previousValue) {
                                    throw new Error(
                                        `Le champ "${field}" ne peut pas être modifié après création.`,
                                    );
                                }
                            }

                            // -------------------------------------------------------------
                            // Le status est le seul champ mutable.
                            // L'admin peut uniquement révoquer une invitation pending.
                            // -------------------------------------------------------------

                            const previousStatus = originalDoc?.status;
                            const nextStatus = data.status ?? previousStatus;

                            if (previousStatus !== nextStatus) {
                                const allowedTransition =
                                    previousStatus === "pending" &&
                                    nextStatus === "revoked";

                                if (!allowedTransition) {
                                    throw new Error(
                                        `Transition de statut interdite : ${previousStatus} → ${nextStatus}.`,
                                    );
                                }
                            }

                            return data;
                        }

                        return data;
                    },
                ],
            },
        };