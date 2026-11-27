
import { 
    APIError, 
    type CollectionConfig, 
    type Where, 
    type PayloadRequest, 
} from "payload";

import { getRelationshipID } from "@/payload/utils/getRelationshipID";

import { CASE_TYPE_OPTIONS } from "@/domain/caseTypes";

// Ensure the case associated with the task is active
async function ensureCaseIsActive(
    req: PayloadRequest,
    taskValue: unknown,
): Promise<void> {
    const taskID = getRelationshipID(taskValue);

    if (!taskID) {
        throw new APIError("Tâche associée introuvable.", 400);
    }

    const relatedTask = await req.payload.findByID({
        collection: "tasks",
        id: taskID,
        depth: 0,
    });

    const caseID = getRelationshipID(relatedTask.case);

    if (!caseID) {
        throw new APIError("Dossier associé introuvable.", 400);
    }

    const relatedCase = await req.payload.findByID({
        collection: "cases",
        id: caseID,
        depth: 0,
    });

    if (relatedCase.status !== "active") {
        throw new APIError(
            "Un dossier archivé est en lecture seule.",
            403,
        );
    }
}

// Build where clause for professional access to medical tasks
async function buildProfessionalWhere(
    req: PayloadRequest,
    professionalCareGroupIDs: unknown[],
): Promise<Where | null> {
    // Extract care group IDs from relationships
    const careGroupIDs = professionalCareGroupIDs
        .map((id) => getRelationshipID(id))
        .filter((id): id is string | number => id !== undefined);

    if (careGroupIDs.length === 0) return null;

    const medicalCases = await req.payload.find({
        collection: "cases",
        depth: 0,
        limit: 100,
        pagination: false,
        overrideAccess: true,
        where: {
            and: [
                {
                    careGroup: {
                        in: careGroupIDs,
                    },
                },
                {
                    type: {
                        equals: "medical",
                    },
                },
            ],
        },
    });

    const medicalCaseIDs = medicalCases.docs.map((caseDoc) => caseDoc.id);

    if (medicalCaseIDs.length === 0) return null;

    const medicalTasks = await req.payload.find({
        collection: "tasks",
        depth: 0,
        limit: 500,
        pagination: false,
        overrideAccess: true,
        where: {
            case: {
                in: medicalCaseIDs,
            },
        },
    });

    const medicalTaskIDs = medicalTasks.docs.map((task) => task.id);

    if (medicalTaskIDs.length === 0) return null;

    return {
        and: [
            {
                careGroup: {
                    in: careGroupIDs,
                },
            },
            {
                task: {
                    in: medicalTaskIDs,
                },
            },
        ],
    };
}

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

                    const taskID = getRelationshipID(rawTask)

                    if (!taskID) return false;

                    const relatedTask = await req.payload.findByID({
                        collection: "tasks",
                        id: taskID,
                        depth: 0,
                    });

                    // Vérifier le dossier associé à la tâche
                    const caseID = getRelationshipID(relatedTask.case);

                    if (!caseID) return false;

                    const relatedCase = await req.payload.findByID({
                        collection: "cases",
                        id: caseID,
                        depth: 0,
                    });

                    // Un dossier archivé ne peut plus recevoir de documents
                    if (relatedCase.status !== "active") return false;

                    const careGroupID = getRelationshipID(relatedCase.careGroup);

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

                    // Same permissions as tasks:
                    // - admin/family: can always attach docs within their caregroup
                    // - professional: can attach docs only to medical tasks
                    if (role === "admin" || role === "family") return true;
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

                    const adminOrFamilyCareGroupIDs = myMemberships.docs
                        .filter(
                            (m) => m.role === "admin" || m.role === "family",
                        )
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const professionalCareGroupIDs = myMemberships.docs
                        .filter((m) => m.role === "professional")
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    if (
                        adminOrFamilyCareGroupIDs.length === 0 &&
                        professionalCareGroupIDs.length === 0
                    ) {
                        return {
                            id: {
                                in: [] as string[],
                            },
                        } as Where;
                    }

                    const or: Where[] = [];

                    if (adminOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: adminOrFamilyCareGroupIDs,
                            },
                        });
                    }

                    if (professionalCareGroupIDs.length > 0) {
                        const professionalWhere =
                            await buildProfessionalWhere(
                                req,
                                professionalCareGroupIDs,
                            );

                        if (professionalWhere) {
                            or.push(professionalWhere);
                        }
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

                    const adminOrFamilyCareGroupIDs = myMemberships.docs
                        .filter(
                            (m) => m.role === "admin" || m.role === "family",
                        )
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const professionalCareGroupIDs = myMemberships.docs
                        .filter((m) => m.role === "professional")
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const or: Where[] = [];

                    if (adminOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: adminOrFamilyCareGroupIDs,
                            },
                        });
                    }

                    if (professionalCareGroupIDs.length > 0) {
                        const professionalWhere =
                            await buildProfessionalWhere(
                                req,
                                professionalCareGroupIDs,
                            );

                        if (professionalWhere) {
                            or.push(professionalWhere);
                        }
                    }

                    if (or.length === 0) return false;

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

                    const adminOrFamilyCareGroupIDs = myMemberships.docs
                        .filter(
                            (m) => m.role === "admin" || m.role === "family",
                        )
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const professionalCareGroupIDs = myMemberships.docs
                        .filter((m) => m.role === "professional")
                        .map((m) => m.careGroup)
                        .filter(Boolean);

                    const or: Where[] = [];

                    if (adminOrFamilyCareGroupIDs.length > 0) {
                        or.push({
                            careGroup: {
                                in: adminOrFamilyCareGroupIDs,
                            },
                        });
                    }

                    if (professionalCareGroupIDs.length > 0) {
                        const professionalWhere =
                            await buildProfessionalWhere(
                                req,
                                professionalCareGroupIDs,
                            );

                        if (professionalWhere) {
                            or.push(professionalWhere);
                        }
                    }

                    if (or.length === 0) return false;

                    return { or } as Where;
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
                beforeChange: [
                    async ({ req, data, originalDoc }) => {
                        const taskValue = data?.task ?? originalDoc?.task;

                        await ensureCaseIsActive(req, taskValue);

                        return data;
                    },
                ],
                beforeDelete: [
                    async ({ req, id }) => {
                        const attachment = await req.payload.findByID({
                            collection: "task-attachments",
                            id,
                            depth: 0,
                        });

                        await ensureCaseIsActive(req, attachment.task);
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
                    options: [...CASE_TYPE_OPTIONS],
                },
                {
                    name: "description",
                    type: "textarea",
                    required: false,
                },
            ],
        };