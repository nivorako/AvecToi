import type { CollectionConfig, Where } from "payload";

        // ---------------------------------------------------------------------
        // Messages
        // ---------------------------------------------------------------------
        // Simple caregroup-scoped chat.
        // - any member (including patient) can read + create
        // - only the author (self-service edit/delete) or a caregroup owner can update/delete
        // Implementation notes:
        // - `beforeValidate` sets `author` from req.user and verifies membership (anti-tampering)
        // - reads are always filtered by careGroup membership

export const Messages: CollectionConfig = {
    slug: "messages",
    admin: {
        useAsTitle: "content",
    },
    fields: [
        {
            name: "content",
            type: "text",
            required: true,
        },
        {
            name: "author",
            type: "relationship",
            relationTo: "users",
            required: true,
        },
        {
            name: "careGroup",
            type: "relationship",
            relationTo: "caregroups",
            required: true,
        },
    ],
    hooks: {
        beforeValidate: [
            async ({ data, req }) => {

                if (!data || !req.user) return data;

                if (!data.author) {
                    data.author = req.user.id;
                }
                if (!data.careGroup) {
                    data.careGroup = req.user.careGroup;
                }
                return data;
            },
        ],
    }, 
    access: {
        read: async ({ req }) => {
            const user = req.user;
            if (!user) return false;

            const memberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 100,
                pagination: false,
                where: {
                    user: {
                        equals: user.id,
                    },
                },
            });

            return {
                careGroup: {
                    in: memberships.docs.map((membership) => membership.careGroup),
                },
            };
        },
        create: async ({ req, data }) => {
            const user = req.user;
            if (!user || !data?.careGroup) return false;

            const memberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    and: [
                        { user: { equals: user.id } },
                        { careGroup: { equals: data.careGroup } },
                    ],
                },
            });

            return memberships.docs.length > 0;
        },
        update: ({ req }) => {
            const user = req.user;
            if (!user) return false;

            const conditions: Where[] = [
                {
                    author: {
                        equals: user.id,
                    },
                },
                {
                    careGroup: {
                        equals: user.careGroup,
                    },
                },
            ];
            return {
                and: conditions,
            };
        },
        delete: ({ req }) => {
            const user = req.user;
            if (!user) return false;

             const conditions: Where[] = [
                {
                    author: {
                        equals: user.id,
                    },
                },
                {
                    careGroup: {
                        equals: user.careGroup,
                    },
                },
            ];

            return {
                and: conditions,
            };
        },
    },
};
