import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

export const CaseInformations: CollectionConfig = {
            slug: "case-informations",
            admin: {
                useAsTitle: "title",
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;

                    // Payload may not populate the request body at access-control time.
                    // Accept the case id from data, body or query string.
                    const rawCase =
                        (data as { case?: unknown } | undefined)?.case ??
                        (req.body as { case?: unknown } | undefined)?.case ??
                        (req.query as { case?: unknown } | undefined)?.case;

                    const caseID = getRelationshipID(rawCase)

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

                    // owner/family: full access
                    // professional: only medical cases
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

                    const patientCareGroupIDs = myMemberships.docs
                        .filter((m) => m.role === "patient")
                        .map((m) => m.careGroup)
                        .filter(Boolean);

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

                    if (patientCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: patientCareGroupIDs,
                            },
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

                    return { or } as Where;
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

                    return { or } as Where;
                },
            },
            hooks: {
                beforeValidate: [
                    async ({ req, data }) => {
                        // Derive careGroup, patient and caseType from the related case
                        // so the access control can reliably filter by them.
                        const rawCase =
                            (data as { case?: unknown } | undefined)?.case ??
                            (req.body as { case?: unknown } | undefined)?.case ??
                            (req.query as { case?: unknown } | undefined)?.case;

                        if (!rawCase) return data;

                        const baseData: Record<string, unknown> =
                            data && typeof data === "object"
                                ? (data as Record<string, unknown>)
                                : {};

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
                { name: "category", type: "select", options: ["doctor", "insurance", "contact", "other"] },
                { name: "title", type: "text", required: true },      // ex: "Médecin traitant"
                { name: "subtitle", type: "text" },                    // ex: "Dr Martin"
                { name: "phone", type: "text" },                     // ex: "01 XX XX XX XX"
                { name: "notes", type: "textarea" },
            ],
        }