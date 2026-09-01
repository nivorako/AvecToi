import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

export const CaseAttachments: CollectionConfig = {
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

                    const caseID = getRelationshipID(rawCase)
                    

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
        }; 