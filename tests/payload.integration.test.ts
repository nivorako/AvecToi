import { MongoMemoryServer } from "mongodb-memory-server";

type PayloadDoc = {
    id: string;
    [key: string]: unknown;
};

type PayloadFindResult = {
    docs: PayloadDoc[];
    totalPages: number;
};

type PayloadTestClient = {
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

type CreatedUser = {
    id: string;
    email: string;
    name: string;
};

describe("Payload integration (ACL + hooks)", () => {
    let mongod: MongoMemoryServer;
    let payload: PayloadTestClient;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();

        process.env.MONGODB_URI = mongod.getUri("payload-tests");
        process.env.PAYLOAD_SECRET =
            process.env.PAYLOAD_SECRET || "test-secret";
        process.env.NEXT_PUBLIC_SERVER_URL = "http://localhost:3000";

        try {
            const mod = await import("payload");
            const { default: config } = await import("@/payload.config");
            payload = (await mod.getPayload({
                config,
            })) as unknown as PayloadTestClient;
        } catch (error) {
            await mongod.stop();
            throw error;
        }
    });

    afterAll(async () => {
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
    });

    afterEach(async () => {
        if (!payload) return;

        const collections = [
            "tasks",
            "cases",
            "patients",
            "memberships",
            "caregroups",
            "users",
        ] as const;

        for (const collection of collections) {
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
    });

    async function createUser(args: {
        email: string;
        password: string;
        name: string;
    }): Promise<CreatedUser> {
        const created = await payload.create({
            collection: "users",
            data: {
                email: args.email,
                password: args.password,
                name: args.name,
            },
            overrideAccess: true,
        });

        const email =
            typeof created.email === "string" ? created.email : args.email;
        const name =
            typeof created.name === "string" ? created.name : args.name;

        return {
            id: created.id,
            email,
            name,
        };
    }

    it("computes and persists patients.fullName on create", async () => {
        const owner = await createUser({
            email: "owner@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await payload.create({
            collection: "caregroups",
            data: {
                name: "Maman",
            },
            user: owner,
            overrideAccess: false,
        });

        // Membership is auto-created by caregroups.afterChange hook.

        const patient = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "Rahaa",
                lastName: "Tina",
            },
            user: owner,
            overrideAccess: false,
        });

        expect(patient.fullName).toBe("Rahaa Tina");

        const readBack = await payload.findByID({
            collection: "patients",
            id: patient.id,
            depth: 0,
            user: owner,
            overrideAccess: false,
        });

        expect(readBack.fullName).toBe("Rahaa Tina");
    });

    it("denies reading patients from a different caregroup (multi-tenant)", async () => {
        const ownerA = await createUser({
            email: "ownerA@example.com",
            password: "password",
            name: "Owner A",
        });

        const ownerB = await createUser({
            email: "ownerB@example.com",
            password: "password",
            name: "Owner B",
        });

        const careGroupA = await payload.create({
            collection: "caregroups",
            data: {
                name: "CareGroup A",
            },
            user: ownerA,
            overrideAccess: false,
        });

        await payload.create({
            collection: "caregroups",
            data: {
                name: "CareGroup B",
            },
            user: ownerB,
            overrideAccess: false,
        });

        const patientA = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroupA.id,
                firstName: "Alice",
                lastName: "A",
            },
            user: ownerA,
            overrideAccess: false,
        });

        const res = await payload.find({
            collection: "patients",
            depth: 0,
            limit: 100,
            pagination: false,
            user: ownerB,
            overrideAccess: false,
            where: {
                id: {
                    equals: patientA.id,
                },
            },
        });

        expect(res.docs).toHaveLength(0);

        // sanity: ownerA can read it
        const res2 = await payload.find({
            collection: "patients",
            depth: 0,
            limit: 100,
            pagination: false,
            user: ownerA,
            overrideAccess: false,
            where: {
                id: {
                    equals: patientA.id,
                },
            },
        });

        expect(res2.docs).toHaveLength(1);
    });
});
