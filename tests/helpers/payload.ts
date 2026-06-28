import { MongoMemoryServer } from "mongodb-memory-server";

// ---------------------------------------------------------------------------
// Types partagés
// ---------------------------------------------------------------------------

export type PayloadDoc = {
    id: string;
    [key: string]: unknown;
};

export type PayloadFindResult = {
    docs: PayloadDoc[];
    totalPages: number;
};

export type PayloadTestClient = {
    find: (...args: unknown[]) => Promise<PayloadFindResult>;
    findByID: (...args: unknown[]) => Promise<PayloadDoc>;
    create: (...args: unknown[]) => Promise<PayloadDoc>;
    update: (...args: unknown[]) => Promise<PayloadDoc>;
    delete: (...args: unknown[]) => Promise<void>;
    destroy?: () => Promise<void> | void;
    db?: {
        destroy?: () => Promise<void> | void;
        close?: () => Promise<void> | void;
        disconnect?: () => Promise<void> | void;
    };
};

export type CreatedUser = {
    id: string;
    email: string;
    name: string;
};

export type CreatedCareGroup = {
    id: string;
};

// ---------------------------------------------------------------------------
// Utilitaire : normalise une relation Payload (string | number | { id }) → string
// ---------------------------------------------------------------------------
export function relationshipToID(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
        const maybe = value as { id?: unknown; value?: unknown };
        if (typeof maybe.id === "string") return maybe.id;
        if (typeof maybe.id === "number") return String(maybe.id);
        if (typeof maybe.value === "string") return maybe.value;
        if (typeof maybe.value === "number") return String(maybe.value);
    }
    return null;
}

// ---------------------------------------------------------------------------
// Cycle de vie : démarrage et arrêt de Payload + MongoDB en mémoire
// À appeler dans beforeAll / afterAll de chaque fichier de test.
// ---------------------------------------------------------------------------

export async function startPayload(): Promise<{
    mongod: MongoMemoryServer;
    payload: PayloadTestClient;
}> {
    const mongod = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongod.getUri("payload-tests");
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || "test-secret";
    process.env.NEXT_PUBLIC_SERVER_URL = "http://localhost:3000";

    try {
        const mod = await import("payload");
        const { default: config } = await import("@/payload.config");
        const payload = (await mod.getPayload({
            config,
        })) as unknown as PayloadTestClient;

        return { mongod, payload };
    } catch (error) {
        await mongod.stop();
        throw error;
    }
}

export async function stopPayload(args: {
    mongod: MongoMemoryServer;
    payload: PayloadTestClient;
}): Promise<void> {
    const { mongod, payload } = args;

    if (payload) {
        if (typeof payload.destroy === "function") {
            await payload.destroy();
        }
        if (typeof payload.db?.destroy === "function") {
            await payload.db.destroy();
        } else if (typeof payload.db?.close === "function") {
            await payload.db.close();
        } else if (typeof payload.db?.disconnect === "function") {
            await payload.db.disconnect();
        }
    }

    await mongod.stop();
}

// ---------------------------------------------------------------------------
// Nettoyage entre chaque test : vide toutes les collections
// À appeler dans afterEach de chaque fichier de test.
// ---------------------------------------------------------------------------

const ALL_COLLECTIONS = [
    "case-attachments",
    "task-attachments",
    "tasks",
    "messages",
    "invitations",
    "cases",
    "patients",
    "memberships",
    "caregroups",
    "users",
] as const;

export async function cleanCollections(
    payload: PayloadTestClient,
): Promise<void> {
    if (!payload) return;

    for (const collection of ALL_COLLECTIONS) {
        const result = await payload.find({
            collection,
            depth: 0,
            limit: 100,
            pagination: false,
            overrideAccess: true,
        });

        for (const doc of result.docs) {
            await payload.delete({
                collection,
                id: doc.id,
                overrideAccess: true,
                depth: 0,
            });
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers de création de données
// Chaque helper reçoit le client payload en premier argument.
// ---------------------------------------------------------------------------

export async function createUser(
    payload: PayloadTestClient,
    args: { email: string; password: string; name: string },
): Promise<CreatedUser> {
    const created = await payload.create({
        collection: "users",
        data: { email: args.email, password: args.password, name: args.name },
        overrideAccess: true,
    });

    const email =
        typeof created.email === "string" ? created.email : args.email;
    const name = typeof created.name === "string" ? created.name : args.name;

    return { id: created.id, email, name };
}

export async function createCareGroupAsOwner(
    payload: PayloadTestClient,
    args: { owner: CreatedUser; name: string },
): Promise<CreatedCareGroup> {
    const created = await payload.create({
        collection: "caregroups",
        data: { name: args.name },
        user: args.owner,
        overrideAccess: false,
    });

    const patients = await payload.find({
        collection: "patients",
        where: { careGroup: { equals: created.id } },
        depth: 0,
    });

    expect(patients.docs.length).toBeGreaterThanOrEqual(1);

    return { id: created.id };
}

export async function addMembership(
    payload: PayloadTestClient,
    args: {
        actingUser: CreatedUser;
        careGroupID: string;
        userID: string;
        role: "owner" | "family" | "professional" | "patient";
    },
): Promise<void> {
    await payload.create({
        collection: "memberships",
        data: {
            careGroup: args.careGroupID,
            user: args.userID,
            role: args.role,
        },
        user: args.actingUser,
        overrideAccess: false,
    });
}

export async function createPatient(
    payload: PayloadTestClient,
    args: {
        actingUser: CreatedUser;
        careGroupID: string;
        firstName: string;
        lastName: string;
    },
): Promise<{ id: string; fullName: string }> {
    const created = await payload.create({
        collection: "patients",
        data: {
            careGroup: args.careGroupID,
            firstName: args.firstName,
            lastName: args.lastName,
        },
        user: args.actingUser,
        overrideAccess: false,
    });

    const fullName =
        typeof created.fullName === "string" ? created.fullName : "";
    return { id: created.id, fullName };
}

export async function createCase(
    payload: PayloadTestClient,
    args: {
        actingUser: CreatedUser;
        careGroupID: string;
        patientID: string;
        title: string;
        type: "medical" | "custom";
    },
): Promise<{ id: string }> {
    const created = await payload.create({
        collection: "cases",
        data: {
            careGroup: args.careGroupID,
            patient: args.patientID,
            title: args.title,
            type: args.type,
        },
        user: args.actingUser,
        overrideAccess: false,
    });

    return { id: created.id };
}

export async function createTask(
    payload: PayloadTestClient,
    args: { actingUser: CreatedUser; caseID: string; title: string },
): Promise<{
    id: string;
    careGroup?: unknown;
    patient?: unknown;
    caseType?: unknown;
}> {
    const created = await payload.create({
        collection: "tasks",
        data: { case: args.caseID, title: args.title, status: "todo" },
        user: args.actingUser,
        overrideAccess: false,
    });

    return {
        id: created.id,
        careGroup: created.careGroup,
        patient: created.patient,
        caseType: created.caseType,
    };
}

export async function createCaseAttachment(
    payload: PayloadTestClient,
    args: {
        actingUser: CreatedUser;
        caseID: string;
        description?: string;
        filename?: string;
    },
): Promise<{
    id: string;
    careGroup?: unknown;
    patient?: unknown;
    caseType?: unknown;
    description?: unknown;
    displayName?: unknown;
    filename?: unknown;
}> {
    const fileName = args.filename ?? "test.pdf";
    const fileBuffer = Buffer.from("%PDF-1.4 test");

    const created = await payload.create({
        collection: "case-attachments",
        data: {
            case: args.caseID,
            ...(args.description ? { description: args.description } : {}),
        },
        file: {
            data: fileBuffer,
            mimetype: "application/pdf",
            name: fileName,
            size: fileBuffer.length,
        },
        user: args.actingUser,
        overrideAccess: false,
    });

    return {
        id: created.id,
        careGroup: created.careGroup,
        patient: created.patient,
        caseType: created.caseType,
        description: created.description,
        displayName: created.displayName,
        filename: created.filename,
    };
}

export async function createInvitation(
    payload: PayloadTestClient,
    args: {
        actingUser: CreatedUser;
        careGroupID: string;
        email: string;
        role: "family" | "professional" | "patient";
    },
): Promise<{ id: string; token: string }> {
    const token = `token-${Math.random().toString(16).slice(2)}`;
    const created = await payload.create({
        collection: "invitations",
        data: {
            careGroup: args.careGroupID,
            email: args.email,
            role: args.role,
            token,
            status: "pending",
            expiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
        },
        user: args.actingUser,
        overrideAccess: false,
    });

    return { id: created.id, token };
}
