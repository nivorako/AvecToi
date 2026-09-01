import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
    type PayloadTestClient,
    startPayload,
    stopPayload,
    cleanCollections,
    createUser,
    createCareGroupAsOwner,
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

    it("computes and persists patients.fullName on create", async () => {
        const owner = await createUser(payload, {
            email: "owner@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "Maman",
        });

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
        const ownerA = await createUser(payload, {
            email: "ownerA@example.com",
            password: "password",
            name: "Owner A",
        });

        const ownerB = await createUser(payload, {
            email: "ownerB@example.com",
            password: "password",
            name: "Owner B",
        });

        const careGroupA = await payload.create({
            collection: "caregroups",
            data: { name: "CareGroup A" },
            user: ownerA,
            overrideAccess: false,
        });

        await payload.create({
            collection: "caregroups",
            data: { name: "CareGroup B" },
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
            where: { id: { equals: patientA.id } },
        });

        expect(res.docs).toHaveLength(0);

        const res2 = await payload.find({
            collection: "patients",
            depth: 0,
            limit: 100,
            pagination: false,
            user: ownerA,
            overrideAccess: false,
            where: { id: { equals: patientA.id } },
        });

        expect(res2.docs).toHaveLength(1);
    });

    it("auto-creates owner membership when creating a caregroup", async () => {
        const owner = await createUser(payload, {
            email: "owner-membership@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

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
});
