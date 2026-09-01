import type { CollectionConfig } from "payload";

// ---------------------------------------------------------------------
// CareGroups (multi-tenant boundary)
// ---------------------------------------------------------------------
// A CareGroup is the shared workspace for a family (and optionally professionals).
// All sensitive content in the app will eventually be scoped by `careGroup`.
export const CareGroups: CollectionConfig = {
    slug: "caregroups",
    admin: {
        useAsTitle: "name",
    },
    access: {
        // Any logged-in user can create a CareGroup (MVP rule).
        create: ({ req }) => Boolean(req.user),
        read: async ({ req }) => {
            if (!req.user) return false;

            // Users can only read CareGroups where they have a Membership.
            // We compute the CareGroup IDs for the current user and return a `where` filter.
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

            const careGroupIDs = memberships.docs
                .map((m) => m.careGroup)
                .filter(Boolean);

            // Return an empty filter (not `false`) so the collection still appears in the admin
            // navigation even if the user has no memberships yet.
            if (!careGroupIDs.length) {
                return {
                    id: {
                        in: [] as string[],
                    },
                };
            }

            return {
                id: {
                    in: careGroupIDs,
                },
            };
        },
        update: async ({ req }) => {
            if (!req.user) return false;

            // Only owners can update CareGroups.
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
                            role: {
                                equals: "owner",
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = memberships.docs
                .map((m) => m.careGroup)
                .filter(Boolean);

            if (!careGroupIDs.length) return false;

            return {
                id: {
                    in: careGroupIDs,
                },
            };
        },
        delete: async ({ req }) => {
            if (!req.user) return false;

            // Only owners can delete CareGroups.
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
                            role: {
                                equals: "owner",
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = memberships.docs
                .map((m) => m.careGroup)
                .filter(Boolean);

            if (!careGroupIDs.length) return false;

            return {
                id: {
                    in: careGroupIDs,
                },
            };
        },
    },
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
        },
        {
            // Optional in MVP, but useful for UX when the same user has multiple caregroups.
            name: "description",
            type: "textarea",
            required: false,
        },
    ],
    hooks: {
        afterChange: [
            async ({ req, doc, operation }) => {
                if (operation !== "create") return;
                if (!req.user) return;

                // On CareGroup creation, automatically create an `owner` Membership for the creator.
                // This ensures the creator immediately has access to the CareGroup and can manage it.
                // We also guard against accidental duplicates.
                const existing = await req.payload.find({
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
                                    equals: doc.id,
                                },
                            },
                        ],
                    },
                });

                if (existing.docs.length > 0) return;

                await req.payload.create({
                    collection: "memberships",
                    data: {
                        user: req.user.id,
                        careGroup: doc.id,
                        role: "owner",
                    },
                });

                await req.payload.create({
                    collection: "patients",
                    data: {
                        careGroup: doc.id,
                        firstName: "Patient",
                        lastName: "Care",
                    },
                });
            },
        ],
    },
};
