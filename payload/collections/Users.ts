import type { CollectionConfig } from "payload";

// ---------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------
// Auth-enabled user collection.
// Payload uses this for login sessions/cookies and admin access.
export const Users: CollectionConfig = {
    slug: "users",
    admin: {
        useAsTitle: "email",
    },
    auth: true,
    access: {
        create: async ({ req }) => {
            if (!req.user) return false;

            const ownerMemberships = await req.payload.find({
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
                            role: {
                                equals: "owner",
                            },
                        },
                    ],
                },
            });

            return ownerMemberships.docs.length > 0;
        },
        read: async ({ req }) => {
            if (!req.user) return false;

            const ownerMemberships = await req.payload.find({
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
                            role: {
                                equals: "owner",
                            },
                        },
                    ],
                },
            });

            if (ownerMemberships.docs.length > 0) return true;

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

            if (!careGroupIDs.length) {
                return {
                    id: {
                        equals: req.user.id,
                    },
                };
            }

            const membershipsInMyCareGroups = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1000,
                pagination: false,
                where: {
                    careGroup: {
                        in: careGroupIDs,
                    },
                },
            });

            const userIDs = Array.from(
                new Set(
                    membershipsInMyCareGroups.docs
                        .map((m) => m.user)
                        .filter(Boolean),
                ),
            );

            return {
                id: {
                    in: userIDs,
                },
            };
        },
        update: ({ req }) => {
            if (!req.user) return false;
            return {
                id: {
                    equals: req.user.id,
                },
            };
        },
        delete: () => false,
    },
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
        },
    ],
};
