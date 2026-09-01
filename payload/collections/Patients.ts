import type { CollectionConfig, Where } from "payload";

// ---------------------------------------------------------------------
        // Patients
        // ---------------------------------------------------------------------
        // Patients are scoped to one CareGroup.
        // In the MVP:
        // - any member can read patients within their caregroup
        // - only owners can create/delete patients
        // - patient role is read-only (no updates)

export const Patients: CollectionConfig = {
            slug: "patients",
            admin: {
                useAsTitle: "fullName",
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    // IMPORTANT: Payload admin checks create permission without passing `data`.
                    // To avoid hiding the "Create new" button, we allow create if the user is an
                    // owner of at least one caregroup.
                    // When `data.careGroup` is present (API or form submission), we additionally
                    // ensure the user is owner of that specific caregroup.
                    const andConditions: Where[] = [
                        {
                            user: {
                                equals: req.user.id,
                            },
                        },
                        {
                            role: {
                                equals: "owner",
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

                    const where: Where = {
                        and: andConditions,
                    };

                    const ownerMemberships = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 1,
                        pagination: false,
                        where,
                    });

                    return ownerMemberships.docs.length > 0;
                },
                read: async ({ req }) => {
                    if (!req.user) return false;

                    // Members can read patients belonging to their caregroups.
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

                    const careGroupIDs = myMemberships.docs
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    // Empty filter keeps the collection visible even if there are no memberships yet.
                    if (!careGroupIDs.length) {
                        return {
                            careGroup: {
                                in: [] as string[],
                            },
                        };
                    }

                    return {
                        careGroup: {
                            in: careGroupIDs,
                        },
                    };
                },
                update: async ({ req }) => {
                    if (!req.user) return false;

                    // Patient accounts must be read-only.
                    // Keep update for owner/family/professional only.
                    const myMemberships = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 100,
                        pagination: false,
                        where: {
                            and: [
                                { user: { equals: req.user.id } },
                                {
                                    role: {
                                        in: ["owner", "family", "professional"],
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
                delete: async ({ req }) => {
                    if (!req.user) return false;

                    // Only owners can delete patients.
                    const ownerMemberships = await req.payload.find({
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
                                        equals: "owner",
                                    },
                                },
                            ],
                        },
                    });

                    const careGroupIDs = ownerMemberships.docs
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
                    name: "fullName",
                    type: "text",
                    required: false,
                    admin: {
                        readOnly: true,
                    },
                },
                {
                    name: "firstName",
                    type: "text",
                    required: true,
                },
                {
                    name: "lastName",
                    type: "text",
                    required: true,
                },
                {
                    name: "emergencyContact",
                    type: "group",
                    fields: [
                        {
                            name: "name",
                            type: "text",
                            required: false,
                        },
                        {
                            name: "phone",
                            type: "text",
                            required: false,
                        },
                    ],
                },
            ],
            hooks: {
                // Keep `fullName` in sync so relationship labels show something human-friendly.
                // This runs on create/update.
                beforeValidate: [
                    async ({ data }) => {
                        if (!data) return data;

                        const firstName =
                            typeof data.firstName === "string"
                                ? data.firstName
                                : "";
                        const lastName =
                            typeof data.lastName === "string"
                                ? data.lastName
                                : "";
                        const fullName = `${firstName} ${lastName}`.trim();

                        return {
                            ...data,
                            fullName,
                        };
                    },
                ],
                // If you already created patients before `fullName` existed, they may not have a value.
                // This hook computes a fallback at read time (does not persist to DB).
                afterRead: [
                    async ({ doc }) => {
                        if (
                            typeof doc.fullName === "string" &&
                            doc.fullName.trim()
                        ) {
                            return doc;
                        }

                        const firstName =
                            typeof doc.firstName === "string"
                                ? doc.firstName
                                : "";
                        const lastName =
                            typeof doc.lastName === "string"
                                ? doc.lastName
                                : "";

                        return {
                            ...doc,
                            fullName: `${firstName} ${lastName}`.trim(),
                        };
                    },
                ],
            },
        }
