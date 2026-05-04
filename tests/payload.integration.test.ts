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

type CreatedCareGroup = {
    id: string;
};

function relationshipToID(value: unknown): string | null {
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

    async function createCareGroupAsOwner(args: {
        owner: CreatedUser;
        name: string;
    }): Promise<CreatedCareGroup> {
        const created = await payload.create({
            collection: "caregroups",
            data: {
                name: args.name,
            },
            user: args.owner,
            overrideAccess: false,
        });

        return { id: created.id };
    }

    async function addMembership(args: {
        actingUser: CreatedUser;
        careGroupID: string;
        userID: string;
        role: "owner" | "family" | "professional";
    }): Promise<void> {
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

    async function createPatient(args: {
        actingUser: CreatedUser;
        careGroupID: string;
        firstName: string;
        lastName: string;
    }): Promise<{ id: string; fullName: string }> {
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

    async function createCase(args: {
        actingUser: CreatedUser;
        careGroupID: string;
        patientID: string;
        title: string;
        type: "medical" | "custom";
    }): Promise<{ id: string }> {
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

    async function createTask(args: {
        actingUser: CreatedUser;
        caseID: string;
        title: string;
    }): Promise<{
        id: string;
        careGroup?: unknown;
        patient?: unknown;
        caseType?: unknown;
    }> {
        const created = await payload.create({
            collection: "tasks",
            data: {
                case: args.caseID,
                title: args.title,
                status: "todo",
            },
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

    it("computes and persists patients.fullName on create", async () => {
        const owner = await createUser({
            email: "owner@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner({
            owner,
            name: "Maman",
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

    it("auto-creates owner membership when creating a caregroup", async () => {
        const owner = await createUser({
            email: "owner-membership@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner({ owner, name: "CG" });

        const memberships = await payload.find({
            collection: "memberships",
            depth: 0,
            limit: 50,
            pagination: false,
            user: owner,
            overrideAccess: false,
            where: {
                and: [
                    { careGroup: { equals: careGroup.id } },
                    { user: { equals: owner.id } },
                    { role: { equals: "owner" } },
                ],
            },
        });

        expect(memberships.docs).toHaveLength(1);
    });

    it("denies creating memberships unless acting user is owner of that caregroup", async () => {
        const owner = await createUser({
            email: "owner-acl@example.com",
            password: "password",
            name: "Owner",
        });

        const family = await createUser({
            email: "family-acl@example.com",
            password: "password",
            name: "Family",
        });

        const pro = await createUser({
            email: "pro-acl@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsOwner({ owner, name: "CG" });

        await addMembership({
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });

        await expect(
            addMembership({
                actingUser: family,
                careGroupID: careGroup.id,
                userID: pro.id,
                role: "professional",
            }),
        ).rejects.toBeTruthy();
    });

    it("professional can read medical cases but not custom cases", async () => {
        const owner = await createUser({
            email: "owner-cases@example.com",
            password: "password",
            name: "Owner",
        });

        const professional = await createUser({
            email: "pro-cases@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsOwner({ owner, name: "CG" });
        await addMembership({
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient({
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Alice",
            lastName: "A",
        });

        const medicalCase = await createCase({
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const customCase = await createCase({
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Custom",
            type: "custom",
        });

        const res = await payload.find({
            collection: "cases",
            depth: 0,
            limit: 100,
            pagination: false,
            user: professional,
            overrideAccess: false,
        });

        const ids = res.docs.map((d) => d.id);
        expect(ids).toContain(medicalCase.id);
        expect(ids).not.toContain(customCase.id);
    });

    it("task.beforeValidate populates derived fields (careGroup/patient/caseType)", async () => {
        const owner = await createUser({
            email: "owner-task-derived@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner({ owner, name: "CG" });
        const patient = await createPatient({
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Bob",
            lastName: "B",
        });

        const medicalCase = await createCase({
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const task = await createTask({
            actingUser: owner,
            caseID: medicalCase.id,
            title: "Task",
        });

        expect(task.caseType).toBe("medical");
        expect(relationshipToID(task.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(task.patient)).toBe(patient.id);
    });

    it("professional can read medical tasks but not custom tasks", async () => {
        const owner = await createUser({
            email: "owner-tasks@example.com",
            password: "password",
            name: "Owner",
        });

        const professional = await createUser({
            email: "pro-tasks@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsOwner({ owner, name: "CG" });
        await addMembership({
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient({
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Cara",
            lastName: "C",
        });

        const medicalCase = await createCase({
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const customCase = await createCase({
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Custom",
            type: "custom",
        });

        const medicalTask = await createTask({
            actingUser: owner,
            caseID: medicalCase.id,
            title: "Medical Task",
        });

        const customTask = await createTask({
            actingUser: owner,
            caseID: customCase.id,
            title: "Custom Task",
        });

        const res = await payload.find({
            collection: "tasks",
            depth: 0,
            limit: 100,
            pagination: false,
            user: professional,
            overrideAccess: false,
        });

        const ids = res.docs.map((d) => d.id);
        expect(ids).toContain(medicalTask.id);
        expect(ids).not.toContain(customTask.id);
    });

    it("forces case.careGroup from patient.careGroup on create (option 2)", async () => {
        const owner = await createUser({
            email: "owner-case-force-create@example.com",
            password: "password",
            name: "Owner",
        });

        const cgA = await createCareGroupAsOwner({ owner, name: "CGA" });
        const cgB = await createCareGroupAsOwner({ owner, name: "CGB" });

        const patientA = await createPatient({
            actingUser: owner,
            careGroupID: cgA.id,
            firstName: "P",
            lastName: "A",
        });

        const created = await payload.create({
            collection: "cases",
            data: {
                careGroup: cgB.id,
                patient: patientA.id,
                title: "Case",
                type: "medical",
            },
            user: owner,
            overrideAccess: false,
        });

        expect(relationshipToID(created.careGroup)).toBe(cgA.id);
    });

    it("recalculates case.careGroup from patient when updating patient", async () => {
        const owner = await createUser({
            email: "owner-case-force-update@example.com",
            password: "password",
            name: "Owner",
        });

        const cgA = await createCareGroupAsOwner({ owner, name: "CGA" });
        const cgB = await createCareGroupAsOwner({ owner, name: "CGB" });

        const patientA = await createPatient({
            actingUser: owner,
            careGroupID: cgA.id,
            firstName: "P",
            lastName: "A",
        });

        const patientB = await createPatient({
            actingUser: owner,
            careGroupID: cgB.id,
            firstName: "P",
            lastName: "B",
        });

        const createdCase = await payload.create({
            collection: "cases",
            data: {
                careGroup: cgA.id,
                patient: patientA.id,
                title: "Case",
                type: "medical",
            },
            user: owner,
            overrideAccess: false,
        });

        const updatedCase = await payload.update({
            collection: "cases",
            id: createdCase.id,
            data: {
                patient: patientB.id,
            },
            user: owner,
            overrideAccess: false,
        });

        expect(relationshipToID(updatedCase.careGroup)).toBe(cgB.id);
    });

    it("rejects creating a case with an invalid patient id", async () => {
        const owner = await createUser({
            email: "owner-case-invalid-patient@example.com",
            password: "password",
            name: "Owner",
        });

        const cg = await createCareGroupAsOwner({ owner, name: "CG" });

        await expect(
            payload.create({
                collection: "cases",
                data: {
                    careGroup: cg.id,
                    patient: "000000000000000000000000",
                    title: "Case",
                    type: "medical",
                },
                user: owner,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("overrides task derived fields even if caller provides wrong values", async () => {
        const owner = await createUser({
            email: "owner-task-override-derived@example.com",
            password: "password",
            name: "Owner",
        });

        const cgA = await createCareGroupAsOwner({ owner, name: "CGA" });
        const cgB = await createCareGroupAsOwner({ owner, name: "CGB" });

        const patientA = await createPatient({
            actingUser: owner,
            careGroupID: cgA.id,
            firstName: "P",
            lastName: "A",
        });

        const caseMedical = await createCase({
            actingUser: owner,
            careGroupID: cgA.id,
            patientID: patientA.id,
            title: "Medical",
            type: "medical",
        });

        const created = await payload.create({
            collection: "tasks",
            data: {
                case: caseMedical.id,
                title: "Task",
                status: "todo",
                careGroup: cgB.id,
                patient: "000000000000000000000000",
                caseType: "custom",
            },
            user: owner,
            overrideAccess: false,
        });

        expect(created.caseType).toBe("medical");
        expect(relationshipToID(created.careGroup)).toBe(cgA.id);
        expect(relationshipToID(created.patient)).toBe(patientA.id);
    });
});
