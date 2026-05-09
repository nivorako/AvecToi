import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import type { Where } from "payload";

export default buildConfig({
    // Payload Admin configuration
    // - `user`: the auth-enabled collection used to log into /admin
    // - `suppressHydrationWarning`: reduces noisy hydration warnings in dev when SSR markup
    //   differs slightly from client markup (common with complex admin UIs)
    admin: {
        user: "users",
        suppressHydrationWarning: true,
    },

    onInit: async (payload) => {
        const limit = 100;
        let page = 1;

        let hasMore = true;
        while (hasMore) {
            const result = await payload.find({
                collection: "patients",
                depth: 0,
                limit,
                page,
                where: {
                    or: [
                        {
                            fullName: {
                                exists: false,
                            },
                        },
                        {
                            fullName: {
                                equals: "",
                            },
                        },
                    ],
                },
            });

            if (!result.docs.length) break;

            for (const doc of result.docs) {
                const firstName =
                    typeof doc.firstName === "string" ? doc.firstName : "";
                const lastName =
                    typeof doc.lastName === "string" ? doc.lastName : "";
                const fullName = `${firstName} ${lastName}`.trim();
                if (!fullName) continue;

                await payload.update({
                    collection: "patients",
                    id: doc.id,
                    data: {
                        fullName,
                    },
                    depth: 0,
                });
            }

            hasMore = page < result.totalPages;
            page += 1;
        }

        page = 1;
        hasMore = true;
        while (hasMore) {
            const result = await payload.find({
                collection: "users",
                depth: 0,
                limit,
                page,
                where: {
                    or: [
                        {
                            name: {
                                exists: false,
                            },
                        },
                        {
                            name: {
                                equals: "",
                            },
                        },
                    ],
                },
            });

            if (!result.docs.length) break;

            for (const doc of result.docs) {
                const email = typeof doc.email === "string" ? doc.email : "";
                const derivedName = email.split("@")[0]?.trim();
                if (!derivedName) continue;

                await payload.update({
                    collection: "users",
                    id: doc.id,
                    data: {
                        name: derivedName,
                    },
                    depth: 0,
                });
            }

            hasMore = page < result.totalPages;
            page += 1;
        }
    },

    // Collections define your data model (schema), admin UI, and API endpoints.
    //
    // Multi-tenancy model (MVP):
    // - `caregroups`: tenant boundary / shared space
    // - `memberships`: joins users to caregroups with a role (owner/family/professional)
    // - `patients`: belongs to a caregroup
    // - `cases`: belongs to a patient + caregroup, and has a type (medical/custom)
    // - `tasks`: belongs to a case
    //
    // Access control strategy:
    // - Most reads are filtered by `careGroup` membership.
    // - Professionals can only see medical content.
    // - We duplicate some derived fields (ex: tasks.careGroup/tasks.caseType) to enforce ACL
    //   without doing joins at query time.
    collections: [
        // ---------------------------------------------------------------------
        // Users
        // ---------------------------------------------------------------------
        // Auth-enabled user collection.
        // Payload uses this for login sessions/cookies and admin access.
        {
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
        },

        // ---------------------------------------------------------------------
        // CareGroups (multi-tenant boundary)
        // ---------------------------------------------------------------------
        // A CareGroup is the shared workspace for a family (and optionally professionals).
        // All sensitive content in the app will eventually be scoped by `careGroup`.
        {
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
        },

        // ---------------------------------------------------------------------
        // Memberships (join table: user <-> caregroup with role)
        // ---------------------------------------------------------------------
        // A Membership defines:
        // - which users belong to which caregroups
        // - what role they have inside that caregroup (owner/family/professional)
        {
            slug: "memberships",
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
                                equals: "owner",
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

                    const ownerMemberships = await req.payload.find({
                        collection: "memberships",
                        depth: 0,
                        limit: 1,
                        pagination: false,
                        where: {
                            and: andConditions,
                        },
                    });

                    return ownerMemberships.docs.length > 0;
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

                    // Only owners can update memberships (e.g. change role / remove someone).
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
                delete: async ({ req }) => {
                    if (!req.user) return false;

                    // Only owners can delete memberships.
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
                    name: "user",
                    type: "relationship",
                    relationTo: "users",
                    required: true,
                },
                {
                    name: "role",
                    type: "select",
                    required: true,
                    options: [
                        {
                            label: "Owner",
                            value: "owner",
                        },
                        {
                            label: "Family",
                            value: "family",
                        },
                        {
                            label: "Professional",
                            value: "professional",
                        },
                    ],
                },
            ],
        },

        {
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
                                    careGroup: {
                                        equals: careGroupID,
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

                    const ownerCareGroupIDs = ownerMemberships.docs
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
                            in: ownerCareGroupIDs.length
                                ? ownerCareGroupIDs
                                : ["__none__"],
                        },
                    });

                    return { or };
                },
                update: async ({ req }) => {
                    if (!req.user) return false;

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
                delete: async ({ req }) => {
                    if (!req.user) return false;

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
                    name: "email",
                    type: "email",
                    required: true,
                },
                {
                    name: "role",
                    type: "select",
                    required: true,
                    options: [
                        {
                            label: "Family",
                            value: "family",
                        },
                        {
                            label: "Professional",
                            value: "professional",
                        },
                    ],
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
        },

        {
            slug: "case-attachments",
            admin: {
                useAsTitle: "filename",
            },
            upload: {
                staticDir: "case-attachments",
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    // Uploads are multipart/form-data. In Payload, `data` / `req.body` can be empty
                    // at access-control time. We therefore accept the case id from the query string
                    // as a reliable fallback: /api/case-attachments?case=<id>
                    const rawCase =
                        (data as { case?: unknown } | undefined)?.case ??
                        (req.body as { case?: unknown } | undefined)?.case ??
                        (req.query as { case?: unknown } | undefined)?.case;

                    console.info("case-attachments.create", {
                        user: req.user?.id,
                        hasData: Boolean(data),
                        dataKeys: data ? Object.keys(data as object) : [],
                        bodyKeys: req.body
                            ? Object.keys(req.body as object)
                            : [],
                        rawCase,
                    });

                    const caseID =
                        typeof rawCase === "string" ||
                        typeof rawCase === "number"
                            ? rawCase
                            : ((rawCase as { id?: string | number } | undefined)
                                  ?.id ??
                              (
                                  rawCase as
                                      | { value?: string | number }
                                      | undefined
                              )?.value);

                    if (!caseID) return false;

                    const relatedCase = await req.payload.findByID({
                        collection: "cases",
                        id: caseID,
                        depth: 0,
                    });

                    console.info("case-attachments.create.relatedCase", {
                        caseID,
                        type: (relatedCase as { type?: unknown } | undefined)
                            ?.type,
                        careGroup: (
                            relatedCase as { careGroup?: unknown } | undefined
                        )?.careGroup,
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

                    console.info("case-attachments.create.membership", {
                        careGroupID,
                        membershipCount: membership.docs.length,
                        role,
                    });

                    // Same permissions as cases/tasks:
                    // - owner/family: can always attach docs within their caregroup
                    // - professional: can attach docs only to medical cases
                    if (role === "owner" || role === "family") return true;
                    if (role === "professional") {
                        return relatedCase?.type === "medical";
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
                        return {
                            id: {
                                in: [] as string[],
                            },
                        } as Where;
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
                                    caseType: {
                                        equals: "medical",
                                    },
                                },
                            ],
                        });
                    }

                    return { or } as Where;
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

                    if (!ownerOrFamilyCareGroupIDs.length) return false;

                    return {
                        careGroup: {
                            in: ownerOrFamilyCareGroupIDs,
                        },
                    };
                },
                delete: async ({ req }) => {
                    if (!req.user) return false;

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
            hooks: {
                beforeValidate: [
                    async ({ req, data }) => {
                        // For multipart uploads, required relationship fields are often missing.
                        // We derive them from the related case so the document validates and ACL can
                        // reliably filter by careGroup/patient/caseType.
                        const rawCase =
                            (data as { case?: unknown } | undefined)?.case ??
                            (req.body as { case?: unknown } | undefined)
                                ?.case ??
                            (req.query as { case?: unknown } | undefined)?.case;

                        if (!rawCase) return data;

                        const baseData: Record<string, unknown> =
                            data && typeof data === "object"
                                ? (data as Record<string, unknown>)
                                : {};

                        const rawDescription =
                            (data as { description?: unknown } | undefined)
                                ?.description ??
                            (req.body as { description?: unknown } | undefined)
                                ?.description;

                        const description =
                            typeof rawDescription === "string"
                                ? rawDescription
                                : undefined;

                        const caseID =
                            typeof rawCase === "string" ||
                            typeof rawCase === "number"
                                ? rawCase
                                : ((rawCase as { id?: string | number }).id ??
                                  (rawCase as { value?: string | number })
                                      .value);

                        if (!caseID) return data;

                        const relatedCase = await req.payload.findByID({
                            collection: "cases",
                            id: caseID,
                            depth: 0,
                        });

                        return {
                            ...baseData,
                            case: caseID,
                            careGroup: relatedCase.careGroup,
                            patient: relatedCase.patient,
                            caseType: relatedCase.type,
                            ...(description !== undefined
                                ? { description }
                                : {}),
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
                    name: "displayName",
                    type: "text",
                    required: false,
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
                    name: "description",
                    type: "textarea",
                    required: false,
                },
            ],
        },

        // ---------------------------------------------------------------------
        // Patients
        // ---------------------------------------------------------------------
        // Patients are scoped to one CareGroup.
        // In the MVP:
        // - any member can read patients within their caregroup
        // - only owners can create/delete patients
        {
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

                    // MVP choice: allow any member to update patient data in their caregroups.
                    // (We can tighten this later if needed.)
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
        },

        // ---------------------------------------------------------------------
        // Cases (dossiers thématiques)
        // ---------------------------------------------------------------------
        // A Case belongs to exactly one Patient (and therefore one CareGroup).
        // In the MVP we keep `type` very simple:
        // - medical: accessible to professionals
        // - custom: non-medical (banking, insurance, etc.) -> not accessible to professionals
        {
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
            hooks: {
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

                    // Keep collection visible even if user has no memberships.
                    if (
                        ownerOrFamilyCareGroupIDs.length === 0 &&
                        professionalCareGroupIDs.length === 0
                    ) {
                        return {
                            id: {
                                in: [] as string[],
                            },
                        } as Where;
                    }

                    // owner/family: can read all cases in their caregroups (medical + custom)
                    // professional: can only read medical cases in their caregroups
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
            ],
        },

        // ---------------------------------------------------------------------
        // Tasks
        // ---------------------------------------------------------------------
        // A Task is linked to a Case.
        // We store derived fields (`careGroup`, `patient`, `caseType`) so access control can be
        // implemented without doing joins at query time.
        //
        // Role rules (MVP):
        // - owner/family: can read and create tasks in their caregroups
        // - professional: can read tasks only when caseType is medical
        // - professional: can create tasks only when the related case is medical
        {
            slug: "tasks",
            admin: {
                useAsTitle: "title",
            },
            // Populate relationships so read-only sidebar fields display labels instead of raw IDs.
            defaultPopulate: {
                careGroup: true,
                patient: true,
                case: true,
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    const caseID =
                        typeof data?.case === "string" ||
                        typeof data?.case === "number"
                            ? data.case
                            : ((
                                  data?.case as {
                                      id?: string | number;
                                      value?: string | number;
                                  }
                              )?.id ??
                              (
                                  data?.case as {
                                      id?: string | number;
                                      value?: string | number;
                                  }
                              )?.value);

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
                    if (role === "owner" || role === "family") return true;

                    if (role === "professional") {
                        return relatedCase?.type === "medical";
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
                        return {
                            id: {
                                in: [] as string[],
                            },
                        } as Where;
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
                                    caseType: {
                                        equals: "medical",
                                    },
                                },
                            ],
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
                                    caseType: {
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

                    // MVP: only owner/family can delete tasks.
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
            ],
        },
    ],

    // Database adapter (MongoDB via Mongoose).
    // `MONGODB_URI` must point to the correct DB name (case-sensitive in Atlas in some situations).
    db: mongooseAdapter({
        url: process.env.MONGODB_URI || "",
    }),

    // Rich text editor adapter for Payload.
    editor: lexicalEditor({}),

    // Secret used for signing tokens/cookies, etc.
    secret: process.env.PAYLOAD_SECRET || "",

    // Server URL used in various places (links, etc). In dev it's usually http://localhost:3000
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,

    // Generates TypeScript types based on your collection schemas.
    typescript: {
        outputFile: "./payload-types.ts",
    },
});
