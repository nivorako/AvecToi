import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
    type PayloadTestClient,
    startPayload,
    stopPayload,
    cleanCollections,
    createUser,
    createCareGroupAsOwner,
    addMembership,
    relationshipToID,
} from "./helpers/payload";

describe("Payload — Messages", () => {
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

    it("patient can create and read messages in their caregroup", async () => {
        const owner = await createUser(payload, {
            email: "owner-patient-messages@example.com",
            password: "password",
            name: "Owner",
        });

        const patientUser = await createUser(payload, {
            email: "patient-messages@example.com",
            password: "password",
            name: "Patient",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: patientUser.id,
            role: "patient",
        });

        const created = await payload.create({
            collection: "messages",
            data: { careGroup: careGroup.id, content: "Bonjour" },
            user: patientUser,
            overrideAccess: false,
        });

        expect(created.id).toBeTruthy();
        expect(relationshipToID(created.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(created.author)).toBe(patientUser.id);

        const read = await payload.find({
            collection: "messages",
            depth: 0,
            limit: 100,
            pagination: false,
            user: patientUser,
            overrideAccess: false,
        });

        expect(read.docs.map((d) => d.id)).toContain(created.id);
    });

    it("patient cannot edit a message authored by someone else", async () => {
        const owner = await createUser(payload, {
            email: "owner-patient-message-edit@example.com",
            password: "password",
            name: "Owner",
        });

        const family = await createUser(payload, {
            email: "family-message-edit@example.com",
            password: "password",
            name: "Family",
        });

        const patientUser = await createUser(payload, {
            email: "patient-message-edit@example.com",
            password: "password",
            name: "Patient",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });

        await addMembership(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: patientUser.id,
            role: "patient",
        });

        const familyMsg = await payload.create({
            collection: "messages",
            data: { careGroup: careGroup.id, content: "Message famille" },
            user: family,
            overrideAccess: false,
        });

        await expect(
            payload.update({
                collection: "messages",
                id: familyMsg.id,
                data: { content: "hack" },
                user: patientUser,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });
});
