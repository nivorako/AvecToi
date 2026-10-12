import type { CollectionConfig, Where } from "payload";

import { ROLE_OPTIONS } from "@/domain/roles";

// ---------------------------------------------------------------------
// Memberships (join table: user <-> caregroup with role)
// ---------------------------------------------------------------------
// A Membership defines:
// - which users belong to which caregroups
// - what role they have inside that caregroup (admin/family/professional/patient)
//   - admin: full management inside the caregroup
//   - family: can collaborate inside the caregroup
//   - professional: read- only on medical content (MVP)
//   - patient: read-only access to caregroup content (cases/tasks/attachments), can use messages
export const Memberships: CollectionConfig = {
    slug: "memberships",
    // Garantit unicité user <==> caregroup. 
    indexes: [
        {
            fields: ["user", "careGroup"],
            unique: true,
        },
    ],
    access: {
        create: async ({ req, data }) => {
            if (!req.user) return false;

            const andConditions: Where[] = [
                {
                    user: {
                        equals: req.user.id,
                    },
                },
                {
                    role: {
                        equals: "admin",
                    },
                },
            ];

            if (data?.careGroup) {
                andConditions.push({
                    careGroup: {
                        equals: data.careGroup,
                    },
                });
            }

            const adminMemberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    and: andConditions,
                },
            });

            return adminMemberships.docs.length > 0;
        },
        read: async ({ req }) => {
            if (!req.user) return false;

            // Members can read all memberships within their caregroups.
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

            // Empty filter so the collection remains visible in the admin nav.
            if (!careGroupIDs.length) {
                return {
                    careGroup: {
                        in: [],
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

            // Only admins can update memberships (e.g. change role / remove someone).
            const adminMemberships = await req.payload.find({
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
                                equals: "admin",
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = adminMemberships.docs
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

            // Only admins can delete memberships.
            const adminMemberships = await req.payload.find({
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
                                equals: "admin",
                            },
                        },
                    ],
                },
            });

            const careGroupIDs = adminMemberships.docs
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
            name: "user",
            type: "relationship",
            relationTo: "users",
            required: true,
        },
        {
            name: "role",
            type: "select",
            required: true,
            options: [...ROLE_OPTIONS],
        },
    ],
};
