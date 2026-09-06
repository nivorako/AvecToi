import type { CollectionConfig, Where } from "payload";

import { INVITABLE_ROLE_OPTIONS } from "@/domain/Roles";

export const Invitations: CollectionConfig = {
            slug: "invitations",
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;
                    const careGroupID =
                        typeof data?.careGroup === "string"
                            ? data.careGroup
                            : (data?.careGroup as { id?: string } | undefined)
                                  ?.id;

                    if (!careGroupID) return false;

                    const adminMemberships = await req.payload.find({
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
                                {
                                    role: {
                                        equals: "admin",
                                    },
                                },
                            ],
                        },
                    });

                    return adminMemberships.docs.length > 0;
                },
                read: async ({ req }) => {
                    if (!req.user) return false;

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

                    const adminCareGroupIDs = adminMemberships.docs
                        .map((m) =>
                            typeof m.careGroup === "string"
                                ? m.careGroup
                                : (m.careGroup as { id?: string } | undefined)
                                      ?.id,
                        )
                        .filter((id): id is string => Boolean(id));

                    const or: Where[] = [];
                    if (req.user.email) {
                        or.push({
                            email: {
                                equals: req.user.email,
                            },
                        });
                    }

                    or.push({
                        careGroup: {
                            in: adminCareGroupIDs.length
                                ? adminCareGroupIDs
                                : ["__none__"],
                        },
                    });

                    return { or };
                },
                update: async ({ req }) => {
                    if (!req.user) return false;

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
                    name: "email",
                    type: "email",
                    required: true,
                },
                {
                    name: "role",
                    type: "select",
                    required: true,
                    // Invitation role controls which membership role will be created when the invite is accepted.
                    // We support "patient" so an admin can invite a read-only patient account.
                    options: [...INVITABLE_ROLE_OPTIONS],
                },
                {
                    name: "token",
                    type: "text",
                    required: true,
                    unique: true,
                },
                {
                    name: "status",
                    type: "select",
                    required: true,
                    defaultValue: "pending",
                    options: [
                        {
                            label: "Pending",
                            value: "pending",
                        },
                        {
                            label: "Accepted",
                            value: "accepted",
                        },
                        {
                            label: "Revoked",
                            value: "revoked",
                        },
                    ],
                },
                {
                    name: "expiresAt",
                    type: "date",
                    required: true,
                },
            ],
        };