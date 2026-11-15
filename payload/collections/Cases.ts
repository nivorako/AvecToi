import { APIError } from "payload";
import type { CollectionConfig, Where } from "payload";

import { CASE_TYPE_OPTIONS } from "@/domain/caseTypes";

// ---------------------------------------------------------------------
// Cases (dossiers thématiques)
// ---------------------------------------------------------------------
//
// A Case belongs to exactly one Patient (and therefore one CareGroup).
//
// `type` identifies the functional domain of the case.
// Access rules must NOT be inferred only from the type:
// permissions are handled by the access-control layer.
//
// `sensitivity` indicates whether additional access rules may be
// required. The detailed sensitivity rules will be handled by the
// access-control layer.
//
// MVP access model:
// - admin: create / read / update / delete
// - family: create / read / update / delete
// - professional: create and read medical cases only
// - patient: read cases only
//
// Admin does not automatically mean universal access.
// The current MVP still grants admin access within its CareGroups;
// finer-grained rules will be handled by Access Control.

export const Cases: CollectionConfig = {
    slug: "cases",

    admin: {
        useAsTitle: "title",
    },

    defaultPopulate: {
        careGroup: true,
        patient: true,
    },

    // -----------------------------------------------------------------
    // Hooks
    // -----------------------------------------------------------------

    hooks: {
        beforeValidate: [
            async ({ req, data, operation, originalDoc }) => {
                if (!data?.patient) {
                    return data;
                }

                const patientID =
                    typeof data.patient === "string" ||
                    typeof data.patient === "number"
                        ? data.patient
                        : (
                              data.patient as {
                                  id?: string | number;
                                  value?: string | number;
                              }
                          ).id ??
                          (
                              data.patient as {
                                  id?: string | number;
                                  value?: string | number;
                              }
                          ).value;

                if (!patientID) {
                    throw new Error("Invalid patient relationship");
                }

                const relatedPatient = await req.payload.findByID({
                    collection: "patients",
                    id: patientID,
                    depth: 0,
                });

                if (!relatedPatient?.careGroup) {
                    throw new Error("Patient has no careGroup");
                }

                // On update, prevent moving a Case to another CareGroup
                // by changing its Patient.
                if (
                    operation === "update" &&
                    originalDoc?.careGroup &&
                    String(originalDoc.careGroup) !==
                        String(relatedPatient.careGroup)
                ) {
                    throw new Error(
                        "A case cannot be moved to another careGroup",
                    );
                }

                // Patient is the source of truth.
                // careGroup is derived from Patient.
                return {
                    ...data,
                    careGroup: relatedPatient.careGroup,
                };
            },
        ],

        beforeChange: [
            async ({ req, data, operation, originalDoc }) => {
                // La création initiale n'est pas concernée.
                if (operation !== "update") {
                    return data;
                }

                // Aucun changement de statut demandé.
                if (
                    data?.status === undefined ||
                    data.status === originalDoc?.status
                ) {
                    return data;
                }

                if (!req.user) {
                    throw new APIError(
                        "Authentication required to change case status",
                        401,
                    );
                }

                // Le CareGroup réel du dossier existant.
                const careGroupID =
                    typeof originalDoc?.careGroup === "object"
                        ? originalDoc.careGroup.id
                        : originalDoc?.careGroup;

                if (!careGroupID) {
                    throw new Error("Case has no careGroup");
                }

                const memberships = await req.payload.find({
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
                                careGroup: {
                                    equals: careGroupID,
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

                if (memberships.docs.length === 0) {
                    throw new APIError(
                        "Only a CareGroup administrator can change case status",
                        403,
                    );
                }

                return data;
            },
        ],

    },

    access: {
        
        create: async ({ req, data }) => {
            if (!req.user) return false;

            // Determine allowed roles based on case type
            const allowedRoles =
                data?.type === "medical"
                    ? ["admin", "family", "professional"]
                    : ["admin", "family"]   

            let careGroupID = data?.careGroup;

            if (data?.patient) {
                const patientID =
                    typeof data.patient === "string" ||
                    typeof data.patient === "number"
                        ? data.patient
                        : (
                              data.patient as {
                                  id?: string | number;
                                  value?: string | number;
                              }
                          ).id ??
                          (
                              data.patient as {
                                  id?: string | number;
                                  value?: string | number;
                              }
                          ).value;

                if (!patientID) return false;

                const relatedPatient = await req.payload.findByID({
                    collection: "patients",
                    id: patientID,
                    depth: 0,
                });

                careGroupID = relatedPatient?.careGroup;
            }

            const andConditions: Where[] = [
                {
                    user: {
                        equals: req.user.id,
                    },
                },
                {
                    role: {
                        in: allowedRoles,
                    },
                },
            ];

            if (careGroupID) {
                andConditions.splice(1, 0, {
                    careGroup: {
                        equals: careGroupID,
                    },
                });
            }

            const authorizedMembership = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    and: andConditions,
                },
            });

            return authorizedMembership.docs.length > 0;
        },

        read: async ({ req }) => {
            if (!req.user) return false;

            const myMemberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 100,
                pagination: false,
                where: {
                    user: {
                        equals: req.user.id,
                    },
                },
            });

            const adminOrFamilyCareGroupIDs = myMemberships.docs
                .filter(
                    (m) => m.role === "admin" || m.role === "family",
                )
                .map((m) => m.careGroup)
                .filter(Boolean);

            const professionalCareGroupIDs = myMemberships.docs
                .filter((m) => m.role === "professional")
                .map((m) => m.careGroup)
                .filter(Boolean);

            const patientCareGroupIDs = myMemberships.docs
                .filter((m) => m.role === "patient")
                .map((m) => m.careGroup)
                .filter(Boolean);

            // No membership = no Cases.
            if (
                adminOrFamilyCareGroupIDs.length === 0 &&
                professionalCareGroupIDs.length === 0 &&
                patientCareGroupIDs.length === 0
            ) {
                return {
                    id: {
                        in: [] as string[],
                    },
                } as Where;
            }

            const or: Where[] = [];

            // admin / family:
            // all Cases in their CareGroups for the MVP.
            if (adminOrFamilyCareGroupIDs.length > 0) {
                or.push({
                    careGroup: {
                        in: adminOrFamilyCareGroupIDs,
                    },
                });
            }

            // professional:
            // only medical Cases in their CareGroups.
            if (professionalCareGroupIDs.length > 0) {
                or.push({
                    and: [
                        {
                            careGroup: {
                                in: professionalCareGroupIDs,
                            },
                        },
                        {
                            type: {
                                equals: "medical",
                            },
                        },
                    ],
                });
            }

            // patient:
            // read-only access to Cases belonging to their CareGroups.
            if (patientCareGroupIDs.length > 0) {
                or.push({
                    careGroup: {
                        in: patientCareGroupIDs,
                    },
                });
            }

            return {
                or,
            } as Where;
        },

        update: async ({ req }) => {
            if (!req.user) return false;

            const myMemberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 100,
                pagination: false,
                where: {
                    user: {
                        equals: req.user.id,
                    },
                },
            });

            // MVP:
            // only admin and family may modify Cases.
            const adminOrFamilyCareGroupIDs = myMemberships.docs
                .filter(
                    (m) => m.role === "admin" || m.role === "family",
                )
                .map((m) => m.careGroup)
                .filter(Boolean);

            if (adminOrFamilyCareGroupIDs.length === 0) {
                return false;
            }

            return {
                careGroup: {
                    in: adminOrFamilyCareGroupIDs,
                },
            };
        },

        delete: async ({ req }) => {
            if (!req.user) return false;

            // MVP:
            // only admin may delete Cases.
            const myMemberships = await req.payload.find({
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
                                in: ["admin"],
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = myMemberships.docs
                .map((m) => m.careGroup)
                .filter(Boolean);

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
            required: true,
        },

        {
            name: "title",
            type: "text",
            required: true,
        },

        {
            name: "type",
            type: "select",
            required: true,
            options: [...CASE_TYPE_OPTIONS],
        },
        {
            name: "subtype",
            type: "text",
        },

        {
            name: "description",
            type: "textarea",
            required: false,
        },

        {
            name: "sensitivity",
            type: "select",
            required: true,
            defaultValue: "low",
            options: [
                {
                    label: "Low",
                    value: "low",
                },
                {
                    label: "Medium",
                    value: "medium",
                },
                {
                    label: "High",
                    value: "high",
                },
            ],
        },

        {
            name: "status",
            type: "select",
            required: true,
            defaultValue: "active",
            options: [
                {
                    label: "Actif",
                    value: "active",
                },
                {
                    label: "Archivé",
                    value: "archived",
                },
            ],
        },
    ],
};

