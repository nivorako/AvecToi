import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

export const Tasks: CollectionConfig = {
    slug: "tasks",

    admin: {
        useAsTitle: "title",
    },

    defaultPopulate: {
        careGroup: true,
        patient: true,
        case: true,
        assignedTo: true,
    },

    access: {
        create: async ({ req, data }) => {
            if (!req.user) return false;

            const caseID = getRelationshipID(data?.case);

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
             * Patient accounts are read-only.
             */
            if (role === "patient") return false;

            /*
             * Admin and family can create tasks
             * within their CareGroup.
             */
            if (role === "admin" || role === "family") {
                return true;
            }

            /*
             * Professional creation remains subject to
             * the access-control layer and the related Case.
             */
            if (role === "professional") {
                return true;
            }

            return false;
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

            if (myMemberships.docs.length === 0) {
                return {
                    id: {
                        in: [] as string[],
                    },
                } as Where;
            }

            const adminOrFamilyCareGroupIDs = myMemberships.docs
                .filter(
                    (membership) =>
                        membership.role === "admin" ||
                        membership.role === "family",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            const professionalCareGroupIDs = myMemberships.docs
                .filter(
                    (membership) =>
                        membership.role === "professional",
                )
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            const patientCareGroupIDs = myMemberships.docs
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
             *
             * Can read tasks belonging to their CareGroups.
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
             * Case-level access remains responsible for
             * determining which Cases the professional may access.
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
             * A patient can consult tasks concerning them
             * or tasks explicitly assigned to them.
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
                            or: [
                                {
                                    patient: {
                                        equals: req.user.id,
                                    },
                                },
                                {
                                    assignedTo: {
                                        equals: req.user.id,
                                    },
                                },
                            ],
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

            const editableCareGroupIDs = myMemberships.docs
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

            /*
             * Task deletion is intentionally restricted
             * to admin and family in the MVP.
             */
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
                                in: ["admin", "family"],
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = myMemberships.docs
                .map((membership) =>
                    getRelationshipID(membership.careGroup),
                )
                .filter(Boolean);

            if (careGroupIDs.length === 0) {
                return false;
            }

            return {
                careGroup: {
                    in: careGroupIDs,
                },
            } as Where;
        },
    },

    hooks: {
        beforeValidate: [
            async ({ req, data }) => {
                if (!data?.case) return data;

                const caseID = getRelationshipID(data.case);

                if (!caseID) return data;

                const relatedCase = await req.payload.findByID({
                    collection: "cases",
                    id: caseID,
                    depth: 0,
                });

                if (!relatedCase) return data;

                return {
                    ...data,
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
            name: "title",
            type: "text",
            required: true,
        },

        {
            name: "description",
            type: "textarea",
            required: false,
        },

        {
            name: "status",
            type: "select",
            required: true,
            defaultValue: "todo",
            options: [
                {
                    label: "À faire",
                    value: "todo",
                },
                {
                    label: "En cours",
                    value: "in_progress",
                },
                {
                    label: "Fait",
                    value: "done",
                },
            ],
        },

        {
            name: "dueDate",
            type: "date",
            required: false,
        },

        {
            name: "assignedTo",
            type: "relationship",
            relationTo: "users",
            required: false,
        },

        {
            name: "urgency",
            type: "select",
            required: true,
            defaultValue: "low",
            options: [
                {
                    label: "Peut attendre",
                    value: "low",
                },
                {
                    label: "Très urgent",
                    value: "high",
                },
            ],
        },

        {
            name: "subtasks",
            type: "array",
            required: false,
            fields: [
                {
                    name: "title",
                    type: "text",
                    required: true,
                },

                {
                    name: "description",
                    type: "textarea",
                    required: false,
                },

                {
                    name: "dueDate",
                    type: "date",
                    required: false,
                },

                {
                    name: "assignedTo",
                    type: "relationship",
                    relationTo: "users",
                    required: false,
                },

                {
                    name: "completed",
                    type: "checkbox",
                    required: true,
                    defaultValue: false,
                },
            ],
        },
    ],
};