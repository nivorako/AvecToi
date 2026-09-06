import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "../utils/getRelationshipID";

        // ---------------------------------------------------------------------
        // Tasks
        // ---------------------------------------------------------------------
        // A Task is linked to a Case.
        // Derived fields (`careGroup`, `patient`, `caseType`) mirror the related case, but
        // permission checks use the related Case as the source of truth.
        //
        // Role rules (MVP):
        // - admin/family: can read and create tasks in their caregroups
        // - professional: can read tasks only when the related case is medical
        // - professional: can create tasks only when the related case is medical
        // - patient: can read tasks in their caregroup, but cannot create/update/delete
        

export const Tasks: CollectionConfig = {
            slug: "tasks",
            admin: {
                useAsTitle: "title",
            },
          
            defaultPopulate: {
                careGroup: true,
                patient: true,
                case: true,
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

                    const careGroupID =
                        typeof relatedCase?.careGroup === "string" ||
                        typeof relatedCase?.careGroup === "number"
                            ? relatedCase.careGroup
                            : (
                                  relatedCase?.careGroup as {
                                      id?: string | number;
                                  }
                              )?.id;

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
                    if (role === "admin" || role === "family") return true;

                    if (role === "professional") {
                        return relatedCase?.type === "medical";
                    }

                    // Patient accounts are read-only (no task creation).
                    if (role === "patient") {
                        return false;
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

                    if (adminOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: adminOrFamilyCareGroupIDs,
                            },
                        });
                    }

                    if (professionalCareGroupIDs.length > 0) {
                        const medicalCases = await req.payload.find({
                            collection: "cases",
                            depth: 0,
                            pagination: false,
                            overrideAccess: true,
                            where: {
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
                            },
                        });

                        or.push({
                            and: [
                                {
                                    careGroup: {
                                        in: professionalCareGroupIDs,
                                    },
                                },
                                {
                                    case: {
                                        in: medicalCases.docs.map(
                                            (relatedCase) => relatedCase.id,
                                        ),
                                    },
                                },
                            ],
                        });
                    }

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

                    if (
                        adminOrFamilyCareGroupIDs.length === 0 &&
                        professionalCareGroupIDs.length === 0
                    ) {
                        return false;
                    }

                    const or: Where[] = [];

                    if (adminOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: adminOrFamilyCareGroupIDs,
                            },
                        });
                    }

                    if (professionalCareGroupIDs.length > 0) {
                        const medicalCases = await req.payload.find({
                            collection: "cases",
                            depth: 0,
                            pagination: false,
                            overrideAccess: true,
                            where: {
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
                            },
                        });

                        or.push({
                            and: [
                                {
                                    careGroup: {
                                        in: professionalCareGroupIDs,
                                    },
                                },
                                {
                                    case: {
                                        in: medicalCases.docs.map(
                                            (relatedCase) => relatedCase.id,
                                        ),
                                    },
                                },
                            ],
                        });
                    }

                    return {
                        or,
                    };
                },
                delete: async ({ req }) => {
                    if (!req.user) return false;

                    // MVP: only admin/family can delete tasks.
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
            hooks: {
                beforeValidate: [
                    async ({ req, data }) => {
                        if (!data?.case) return data;

                        const caseID =
                            typeof data.case === "string" ||
                            typeof data.case === "number"
                                ? data.case
                                : ((
                                      data.case as {
                                          id?: string | number;
                                          value?: string | number;
                                      }
                                  ).id ??
                                  (
                                      data.case as {
                                          id?: string | number;
                                          value?: string | number;
                                      }
                                  ).value);

                        if (!caseID) return data;

                        const relatedCase = await req.payload.findByID({
                            collection: "cases",
                            id: caseID,
                            depth: 0,
                        });

                        return {
                            ...data,
                            careGroup: relatedCase.careGroup,
                            patient: relatedCase.patient,
                            caseType: relatedCase.type,
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
                    name: "caseType",
                    type: "select",
                    required: true,
                    admin: {
                        readOnly: true,
                        position: "sidebar",
                    },
                    options: [
                        {
                            label: "Medical",
                            value: "medical",
                        },
                        {
                            label: "Custom",
                            value: "custom",
                        },
                    ],
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
                            label: "To do",
                            value: "todo",
                        },
                        {
                            label: "In progress",
                            value: "in_progress",
                        },
                        {
                            label: "Done",
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