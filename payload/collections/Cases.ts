import type { CollectionConfig, Where } from "payload";

        // ---------------------------------------------------------------------
        // Cases (dossiers thématiques)
        // ---------------------------------------------------------------------
        // A Case belongs to exactly one Patient (and therefore one CareGroup).
        // In the MVP we keep `type` very simple:
        // - medical: accessible to professionals
        // - custom: non-medical (banking, insurance, etc.) -> not accessible to professionals
        // - patient: can read all cases in their caregroups, but cannot create/update/delete

export const Cases : CollectionConfig = {
            slug: "cases",
            admin: {
                useAsTitle: "title",
            },
            // Admin UI often fetches documents at depth 0 for performance.
            // `defaultPopulate` ensures the relationships still come back populated enough to display
            // their human-friendly labels (based on the target collection's `useAsTitle`).
            defaultPopulate: {
                careGroup: true,
                patient: true,
            },
            hooks : {
                beforeValidate: [
                    async ({ req, data }) => {
                        if (!data?.patient) return data;

                        const patientID =
                            typeof data.patient === "string" ||
                            typeof data.patient === "number"
                                ? data.patient
                                : ((
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
                                  ).value);

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

                        return {
                            ...data,
                            careGroup: relatedPatient.careGroup,
                        };
                    },
                ],
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    // Admin UI may check create permission without data.
                    // Allow the button if the user is owner/family of at least one caregroup.
                    const andConditions: Where[] = [
                        {
                            user: {
                                equals: req.user.id,
                            },
                        },
                        {
                            role: {
                                in: ["owner", "family"],
                            },
                        },
                    ];

                    if (data?.careGroup) {
                        andConditions.splice(1, 0, {
                            careGroup: {
                                equals: data.careGroup,
                            },
                        });
                    }

                    const ownerOrFamily = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 1,
                        pagination: false,
                        where: {
                            and: andConditions,
                        },
                    });

                    return ownerOrFamily.docs.length > 0;
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

                    const ownerOrFamilyCareGroupIDs = myMemberships.docs
                        .filter(
                            (m) => m.role === "owner" || m.role === "family",
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

                    // Keep collection visible even if user has no memberships.
                    if (
                        ownerOrFamilyCareGroupIDs.length === 0 &&
                        professionalCareGroupIDs.length === 0 &&
                        patientCareGroupIDs.length === 0
                    ) {
                        return {
                            id: {
                                in: [] as string[],
                            },
                        } as Where;
                    }

                    // owner/family: can read all cases in their caregroups (medical + custom)
                    // professional: can only read medical cases in their caregroups
                    // patient: can read all cases in their caregroup
                    const or: Where[] = [];

                    if (ownerOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: ownerOrFamilyCareGroupIDs,
                            },
                        });
                    }

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

                    const ownerOrFamilyCareGroupIDs = myMemberships.docs
                        .filter(
                            (m) => m.role === "owner" || m.role === "family",
                        )
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const professionalCareGroupIDs = myMemberships.docs
                        .filter((m) => m.role === "professional")
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    if (
                        ownerOrFamilyCareGroupIDs.length === 0 &&
                        professionalCareGroupIDs.length === 0
                    ) {
                        return false;
                    }

                    const or: Where[] = [];

                    if (ownerOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: ownerOrFamilyCareGroupIDs,
                            },
                        });
                    }

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

                    return {
                        or,
                    };
                },
                delete: async ({ req }) => {
                    if (!req.user) return false;

                    // MVP: only owner/family can delete cases.
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
                                        in: ["owner", "family"],
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
                    name: "description",
                    type: "textarea",
                    required: false,
                },
                {
                    name: "status",
                    type: "select",
                    required: false,
                    defaultValue: "active",
                    options: [
                        { label: "Actif", value: "active" },
                        { label: "Archivé", value: "archived" },
                    ],
                },
            ],
        }