import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
    type PayloadTestClient,
    startPayload,
    stopPayload,
    cleanCollections,
    createUser,
    createCareGroupAsAdmin,
} from "./helpers/payload";

describe("Payload — Patients", () => {
    let mongod: MongoMemoryServer;
    let payload: PayloadTestClient;

    beforeAll(async () => {
        ({ mongod, payload } = await startPayload());
    });

    afterAll(async () => {
        await stopPayload({ mongod, payload });
    });

    afterEach(async () => {
        await cleanCollections(payload);
    });

    it("creates a unique sparse MongoDB index for patients.user", async () => {
        const client = new MongoClient(mongod.getUri("payload-tests"));

        try {
            await client.connect();
            const indexes = await client
                .db("payload-tests")
                .collection("patients")
                .indexes();

            expect(indexes).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        key: { user: 1 },
                        sparse: true,
                        unique: true,
                    }),
                ]),
            );
        } finally {
            await client.close();
        }
    });

    it("allows multiple patients without a user", async () => {
        const admin = await createUser(payload, {
            email: "admin-optional-user@example.com",
            password: "password",
            name: "Admin",
        });
        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Optional user",
        });

        const firstPatient = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "First",
                lastName: "Patient",
            },
            overrideAccess: true,
        });
        const secondPatient = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "Second",
                lastName: "Patient",
            },
            overrideAccess: true,
        });

        expect(firstPatient.id).not.toBe(secondPatient.id);
        expect(firstPatient.user ?? null).toBeNull();
        expect(secondPatient.user ?? null).toBeNull();
    });

    it("rejects a duplicate patients.user at the MongoDB level", async () => {
        const admin = await createUser(payload, {
            email: "admin-unique-user@example.com",
            password: "password",
            name: "Admin",
        });
        const patientUser = await createUser(payload, {
            email: "patient-unique-user@example.com",
            password: "password",
            name: "Patient",
        });
        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Unique user",
        });
        const patient = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "First",
                lastName: "Linked",
            },
            overrideAccess: true,
        });

        await payload.update({
            collection: "patients",
            id: patient.id,
            data: {
                user: patientUser.id,
            },
            user: admin,
            overrideAccess: true,
        });

        const client = new MongoClient(mongod.getUri("payload-tests"));

        try {
            await client.connect();
            await expect(
                client.db("payload-tests").collection("patients").insertOne({
                    careGroup: new ObjectId(careGroup.id),
                    firstName: "Second",
                    lastName: "Linked",
                    user: new ObjectId(patientUser.id),
                }),
            ).rejects.toMatchObject({ code: 11000 });
        } finally {
            await client.close();
        }

        const linkedPatients = await payload.find({
            collection: "patients",
            depth: 0,
            pagination: false,
            overrideAccess: true,
            where: {
                user: {
                    equals: patientUser.id,
                },
            },
        });

        expect(linkedPatients.docs).toHaveLength(1);
    });

    it("computes and persists patients.fullName on create", async () => {
        const admin = await createUser(payload, {
            email: "admin@example.com",
            password: "password",
            name: "Admin",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Maman",
        });

        const patient = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "Rahaa",
                lastName: "Tina",
            },
            user: admin,
            overrideAccess: false,
        });

        expect(patient.fullName).toBe("Rahaa Tina");

        const readBack = await payload.findByID({
            collection: "patients",
            id: patient.id,
            depth: 0,
            user: admin,
            overrideAccess: false,
        });

        expect(readBack.fullName).toBe("Rahaa Tina");
    });

    it("denies reading patients from a different caregroup (multi-tenant)", async () => {
        const adminA = await createUser(payload, {
            email: "adminA@example.com",
            password: "password",
            name: "Admin A",
        });

        const adminB = await createUser(payload, {
            email: "adminB@example.com",
            password: "password",
            name: "Admin B",
        });

        const careGroupA = await payload.create({
            collection: "caregroups",
            data: { name: "CareGroup A" },
            user: adminA,
            overrideAccess: false,
        });

        await payload.create({
            collection: "caregroups",
            data: { name: "CareGroup B" },
            user: adminB,
            overrideAccess: false,
        });

        const patientA = await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroupA.id,
                firstName: "Alice",
                lastName: "A",
            },
            user: adminA,
            overrideAccess: false,
        });

        const res = await payload.find({
            collection: "patients",
            depth: 0,
            limit: 100,
            pagination: false,
            user: adminB,
            overrideAccess: false,
            where: { id: { equals: patientA.id } },
        });

        expect(res.docs).toHaveLength(0);

        const res2 = await payload.find({
            collection: "patients",
            depth: 0,
            limit: 100,
            pagination: false,
            user: adminA,
            overrideAccess: false,
            where: { id: { equals: patientA.id } },
        });

        expect(res2.docs).toHaveLength(1);
    });

    it("auto-creates admin membership when creating a caregroup", async () => {
        const admin = await createUser(payload, {
            email: "admin-membership@example.com",
            password: "password",
            name: "Admin",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        const memberships = await payload.find({
            collection: "memberships",
            depth: 0,
            limit: 50,
            pagination: false,
            user: admin,
            overrideAccess: false,
            where: {
                and: [
                    { careGroup: { equals: careGroup.id } },
                    { user: { equals: admin.id } },
                    { role: { equals: "admin" } },
                ],
            },
        });

        expect(memberships.docs).toHaveLength(1);
    });
});
