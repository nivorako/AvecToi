import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

const VISIBILITY_OPTIONS = ["shared", "patient", "internal"] as const;

type Visibility = (typeof VISIBILITY_OPTIONS)[number];

export const CaseInformations: CollectionConfig = {
    slug: "case-informations",

    admin: {
        useAsTitle: "title",
    },

    access: {
        create: async ({ req, data }) => {
            if (!req.user) return false;

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

            const careGroupID = getRelationshipID(relatedCase?.careGroup);

            if (!careGroupID) return false;

            const membership = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    and: [
                        { user: { equals: req.user.id } },
                        { careGroup: { equals: careGroupID } },
                    ],
                },
            });

            const role = membership.docs[0]?.role;

            /*
             * Patient is read-only.
             *
             * Professional access is additionally governed by
             * the Case access rules. The information itself does
             * not bypass those rules.
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
                .map((membership) => getRelationshipID(membership.careGroup))
                .filter(Boolean);

            const professionalCareGroupIDs = memberships.docs
                .filter(
                    (membership) => membership.role === "professional",
                )
                .map((membership) => getRelationshipID(membership.careGroup))
                .filter(Boolean);

            const patientCareGroupIDs = memberships.docs
                .filter((membership) => membership.role === "patient")
                .map((membership) => getRelationshipID(membership.careGroup))
                .filter(Boolean);

            const or: Where[] = [];

            /*
             * Admin / Family
             *
             * They can read CaseInformations belonging to
             * their CareGroups.
             *
             * Additional Case-level sensitivity/permission rules
             * can restrict access later through the access-control
             * layer.
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
             * A professional must belong to the CareGroup.
             *
             * Case-level permissions remain responsible for
             * determining whether the professional may access
             * the related Case.
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
             * The patient can only see information explicitly
             * marked as visible to the patient.
             *
             * "internal" is therefore excluded here.
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
                .map((membership) => getRelationshipID(membership.careGroup))
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

            const adminOrFamilyCareGroupIDs = memberships.docs
                .filter(
                    (membership) =>
                        membership.role === "admin" ||
                        membership.role === "family",
                )
                .map((membership) => getRelationshipID(membership.careGroup))
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

                    /*
                     * These fields are derived from Case.
                     * The client should not be able to choose
                     * another CareGroup or Patient independently.
                     */
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
            name: "category",
            type: "select",
            options: [
                {
                    label: "Médecin",
                    value: "doctor",
                },
                {
                    label: "Assurance",
                    value: "insurance",
                },
                {
                    label: "Contact",
                    value: "contact",
                },
                {
                    label: "Autre",
                    value: "other",
                },
            ],
        },

        {
            name: "title",
            type: "text",
            required: true,
        },

        {
            name: "subtitle",
            type: "text",
        },

        {
            name: "phone",
            type: "text",
        },

        {
            name: "notes",
            type: "textarea",
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
                    "Détermine qui peut consulter cette information.",
            },
        },
    ],
};