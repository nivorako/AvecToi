import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

const VISIBILITY_OPTIONS = ["shared", "patient", "internal"] as const;

export const CaseAttachments: CollectionConfig = {
    slug: "case-attachments",

    admin: {
        useAsTitle: "filename",
    },

    upload: {
        staticDir: "case-attachments",
    },

    access: {
        create: async ({ req, data }) => {
            if (!req.user) return false;

            /*
             * Multipart/form-data may not be completely available
             * through data / req.body during Payload access checks.
             * The case id can therefore also come from the query string.
             */
            const rawCase =
                (data as { case?: unknown } | undefined)?.case ??
                (req.body as { case?: unknown } | undefined)?.case ??
                (req.query as { case?: unknown } | undefined)?.case;

            const caseID = getRelationshipID(rawCase);

            if (!caseID) return false;

            const relatedCase = await req.payload.findByID({
                collection: "cases",
                id: caseID,
                depth: 0,
            }); 

            if (!relatedCase) return false;

            const careGroupID = getRelationshipID(
                relatedCase.careGroup,
            );

            if (!careGroupID) return false;

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

            const role = membership.docs[0]?.role;

            /*
             * Patient is read-only.
             *
             * Case-level access restrictions will later be
             * centralized in the Access Control layer.
             */
            if (role === "patient") return false;

            if (
                role === "admin" ||
                role === "family" ||
                role === "professional"
            ) {
                return true;
            }

            return false;
        },

        read: async ({ req }) => {
            if (!req.user) return false;

            const memberships = await req.payload.find({
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

            if (memberships.docs.length === 0) {
                return {
                    id: {
                        in: [] as string[],
                    },
                } as Where;
            }

            const adminOrFamilyCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "admin" ||
                        membership.role === "family",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            const professionalCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "professional",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            const patientCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "patient",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            const or: Where[] = [];

            /*
             * Admin / Family
             */
            if (adminOrFamilyCareGroupIDs.length > 0) {
                or.push({
                    careGroup: {
                        in: adminOrFamilyCareGroupIDs,
                    },
                });
            }

            /*
             * Professional
             *
             * Access to the related Case remains subject to
             * the Case-level permission system.
             */
            if (professionalCareGroupIDs.length > 0) {
                or.push({
                    careGroup: {
                        in: professionalCareGroupIDs,
                    },
                });
            }

            /*
             * Patient
             *
             * Only attachments explicitly marked "patient"
             * are visible to the patient.
             *
             * "shared" is intentionally NOT included here:
             * visibility has an explicit meaning.
             */
            if (patientCareGroupIDs.length > 0) {
                or.push({
                    and: [
                        {
                            careGroup: {
                                in: patientCareGroupIDs,
                            },
                        },
                        {
                            visibility: {
                                equals: "patient",
                            },
                        },
                    ],
                });
            }

            if (or.length === 0) {
                return {
                    id: {
                        in: [] as string[],
                    },
                } as Where;
            }

            return {
                or,
            } as Where;
        },

        update: async ({ req }) => {
            if (!req.user) return false;

            const memberships = await req.payload.find({
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

            const editableCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "admin" ||
                        membership.role === "family" ||
                        membership.role === "professional",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            if (editableCareGroupIDs.length === 0) {
                return false;
            }

            return {
                careGroup: {
                    in: editableCareGroupIDs,
                },
            } as Where;
        },

        delete: async ({ req }) => {
            if (!req.user) return false;

            const memberships = await req.payload.find({
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

            /*
             * Deleting an attachment is intentionally more
             * restrictive than creating/updating one.
             */
            const adminOrFamilyCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "admin" ||
                        membership.role === "family",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            if (adminOrFamilyCareGroupIDs.length === 0) {
                return false;
            }

            return {
                careGroup: {
                    in: adminOrFamilyCareGroupIDs,
                },
            } as Where;
        },
    },

    hooks: {
        beforeValidate: [
            async ({ req, data }) => {
                /*
                 * For multipart uploads, relationship fields may not
                 * be available directly in the submitted data.
                 *
                 * We derive CareGroup and Patient from the Case.
                 */
                const rawCase =
                    (data as { case?: unknown } | undefined)?.case ??
                    (req.body as { case?: unknown } | undefined)?.case ??
                    (req.query as { case?: unknown } | undefined)?.case;

                if (!rawCase) return data;

                const caseID = getRelationshipID(rawCase);

                if (!caseID) return data;

                const relatedCase = await req.payload.findByID({
                    collection: "cases",
                    id: caseID,
                    depth: 0,
                });

                if (!relatedCase) return data;

                const baseData: Record<string, unknown> =
                    data && typeof data === "object"
                        ? (data as Record<string, unknown>)
                        : {};

                return {
                    ...baseData,
                    case: caseID,
                    careGroup: relatedCase.careGroup,
                    patient: relatedCase.patient,
                };
            },
        ],
    },

    fields: [
        {
            name: "careGroup",
            type: "relationship",
            relationTo: "caregroups",
            required: true,
            admin: {
                readOnly: true,
                position: "sidebar",
            },
        },

        {
            name: "patient",
            type: "relationship",
            relationTo: "patients",
            required: true,
            admin: {
                readOnly: true,
                position: "sidebar",
            },
        },

        {
            name: "case",
            type: "relationship",
            relationTo: "cases",
            required: true,
        },

        {
            name: "displayName",
            type: "text",
            required: false,
        },

        {
            name: "description",
            type: "textarea",
            required: false,
        },

        {
            name: "visibility",
            type: "select",
            required: true,
            defaultValue: "shared",
            options: VISIBILITY_OPTIONS.map((value) => ({
                label:
                    value === "shared"
                        ? "Partagé"
                        : value === "patient"
                          ? "Visible par le patient"
                          : "Interne",
                value,
            })),
            admin: {
                position: "sidebar",
                description:
                    "Détermine qui peut consulter cette pièce jointe.",
            },
        },
    ],
};