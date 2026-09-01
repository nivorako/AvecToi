import type { CollectionConfig, Where } from "payload";
import { getRelationshipID } from "@/payload/utils/getRelationshipID";

export const TaskAttachments: CollectionConfig = {
            slug: "task-attachments",
            admin: {
                useAsTitle: "filename",
            },
            upload: {
                staticDir: "task-attachments",
            },
            access: {
                create: async ({ req, data }) => {
                    if (!req.user) return false;
 
                    // Uploads are multipart/form-data. In Payload, `data` / `req.body` can be empty
                    // at access-control time. We therefore accept the task id from the query string
                    // as a reliable fallback: /api/task-attachments?task=<id>
                    const rawTask =
                        (data as { task?: unknown } | undefined)?.task ??
                        (req.body as { task?: unknown } | undefined)?.task ??
                        (req.query as { task?: unknown } | undefined)?.task;

                    console.info("task-attachments.create", {
                        user: req.user?.id,
                        hasData: Boolean(data),
                        dataKeys: data ? Object.keys(data as object) : [],
                        bodyKeys: req.body
                            ? Object.keys(req.body as object)
                            : [],
                        rawTask,
                    });

                    const taskID = getRelationshipID(rawTask)

                    if (!taskID) return false;

                    const relatedTask = await req.payload.findByID({
                        collection: "tasks",
                        id: taskID,
                        depth: 0,
                    });

                    console.info("task-attachments.create.relatedTask", {
                        taskID,
                        type: (relatedTask as { type?: unknown } | undefined)
                            ?.type,
                        careGroup: (
                            relatedTask as { careGroup?: unknown } | undefined
                        )?.careGroup,
                    });

                    const careGroupID =
                        typeof relatedTask?.careGroup === "string" ||
                        typeof relatedTask?.careGroup === "number"
                            ? relatedTask.careGroup
                            : (
                                  relatedTask?.careGroup as {
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

                    console.info("task-attachments.create.membership", {
                        careGroupID,
                        membershipCount: membership.docs.length,
                        role,
                    });

                    // Same permissions as tasks:
                    // - owner/family: can always attach docs within their caregroup
                    // - professional: can attach docs only to medical tasks
                    if (role === "owner" || role === "family") return true;
                    if (role === "professional") {
                        return relatedTask?.type === "medical";
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
                                        exists: false,
                                    },
                                },
                                {
                                    taskType: {
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
                        // We derive them from the related task so the document validates and ACL can
                        // reliably filter by careGroup/patient/taskType.
                        const rawTask =
                            (data as { task?: unknown } | undefined)?.task ??
                            (req.body as { task?: unknown } | undefined)
                                ?.task ??
                            (req.query as { task?: unknown } | undefined)?.task;

                        if (!rawTask) return data;

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

                        const taskID =
                            typeof rawTask === "string" ||
                            typeof rawTask === "number"
                                ? rawTask
                                : ((rawTask as { id?: string | number }).id ??
                                  (rawTask as { value?: string | number })
                                      .value);

                        if (!taskID) return data;

                        const relatedTask = await req.payload.findByID({
                            collection: "tasks",
                            id: taskID,
                            depth: 0,
                        });

                        return {
                            ...baseData,
                            task: taskID,
                            careGroup: relatedTask.careGroup,
                            patient: relatedTask.patient,
                            taskType: relatedTask.caseType,
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
                    name: "task",
                    type: "relationship",
                    relationTo: "tasks",
                    required: true,
                },
                {
                    name: "taskType",
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