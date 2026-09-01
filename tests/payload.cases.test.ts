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
    createPatient,
    createCase,
    createCaseAttachment,
    relationshipToID,
} from "./helpers/payload";

describe("Payload — Cases & Case Attachments", () => {
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

    it("patient can read cases in their caregroup (medical + custom)", async () => {
        const owner = await createUser(payload, {
            email: "owner-patient-cases@example.com",
            password: "password",
            name: "Owner",
        });

        const patientUser = await createUser(payload, {
            email: "patient-cases@example.com",
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

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "P",
            lastName: "T",
        });

        const medicalCase = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const customCase = await createCase(payload, {
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
            user: patientUser,
            overrideAccess: false,
        });

        const ids = res.docs.map((d) => d.id);
        expect(ids).toContain(medicalCase.id);
        expect(ids).toContain(customCase.id);
    });

    it("patient cannot update case description", async () => {
        const owner = await createUser(payload, {
            email: "owner-patient-case-update@example.com",
            password: "password",
            name: "Owner",
        });

        const patientUser = await createUser(payload, {
            email: "patient-case-update@example.com",
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

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "P",
            lastName: "T",
        });

        const caseDoc = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "custom",
        });

        await expect(
            payload.update({
                collection: "cases",
                id: caseDoc.id,
                data: { description: "patient update" },
                user: patientUser,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("lets family create cases but denies professionals creating cases", async () => {
        const owner = await createUser(payload, {
            email: "owner-case-create@example.com",
            password: "password",
            name: "Owner",
        });

        const family = await createUser(payload, {
            email: "family-case-create@example.com",
            password: "password",
            name: "Family",
        });

        const professional = await createUser(payload, {
            email: "pro-case-create@example.com",
            password: "password",
            name: "Pro",
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
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "A",
            lastName: "B",
        });

        const familyCase = await payload.create({
            collection: "cases",
            data: {
                careGroup: careGroup.id,
                patient: patient.id,
                title: "Family case",
                type: "custom",
            },
            user: family,
            overrideAccess: false,
        });

        expect(familyCase.id).toBeTruthy();

        await expect(
            payload.create({
                collection: "cases",
                data: {
                    careGroup: careGroup.id,
                    patient: patient.id,
                    title: "Pro case",
                    type: "medical",
                },
                user: professional,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("professional can read medical cases but not custom cases", async () => {
        const owner = await createUser(payload, {
            email: "owner-cases@example.com",
            password: "password",
            name: "Owner",
        });

        const professional = await createUser(payload, {
            email: "pro-cases@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Alice",
            lastName: "A",
        });

        const medicalCase = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const customCase = await createCase(payload, {
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

    it("forces case.careGroup from patient.careGroup on create", async () => {
        const owner = await createUser(payload, {
            email: "owner-case-force-create@example.com",
            password: "password",
            name: "Owner",
        });

        const cgA = await createCareGroupAsOwner(payload, {
            owner,
            name: "CGA",
        });
        const cgB = await createCareGroupAsOwner(payload, {
            owner,
            name: "CGB",
        });

        const patientA = await createPatient(payload, {
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
        const owner = await createUser(payload, {
            email: "owner-case-force-update@example.com",
            password: "password",
            name: "Owner",
        });

        const cgA = await createCareGroupAsOwner(payload, {
            owner,
            name: "CGA",
        });
        const cgB = await createCareGroupAsOwner(payload, {
            owner,
            name: "CGB",
        });

        const patientA = await createPatient(payload, {
            actingUser: owner,
            careGroupID: cgA.id,
            firstName: "P",
            lastName: "A",
        });

        const patientB = await createPatient(payload, {
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
            data: { patient: patientB.id },
            user: owner,
            overrideAccess: false,
        });

        expect(relationshipToID(updatedCase.careGroup)).toBe(cgB.id);
    });

    it("rejects creating a case with an invalid patient id", async () => {
        const owner = await createUser(payload, {
            email: "owner-case-invalid-patient@example.com",
            password: "password",
            name: "Owner",
        });

        const cg = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

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

    it("owner can upload an attachment and derived fields are populated", async () => {
        const owner = await createUser(payload, {
            email: "owner-attachments@example.com",
            password: "password",
            name: "Owner",
        });

        const careGroup = await createCareGroupAsOwner(payload, {
            owner,
            name: "CG",
        });

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Pat",
            lastName: "One",
        });

        const caseDoc = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "custom",
        });

        const attachment = await createCaseAttachment(payload, {
            actingUser: owner,
            caseID: caseDoc.id,
            description: "Doc important",
            filename: "owner.pdf",
        });

        expect(relationshipToID(attachment.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(attachment.patient)).toBe(patient.id);
        expect(attachment.caseType).toBe("custom");
        expect(attachment.description).toBe("Doc important");
        expect(typeof attachment.filename).toBe("string");
    });

    it("family can upload, rename (displayName), and delete an attachment", async () => {
        const owner = await createUser(payload, {
            email: "owner-attachments-family@example.com",
            password: "password",
            name: "Owner",
        });

        const family = await createUser(payload, {
            email: "family-attachments@example.com",
            password: "password",
            name: "Family",
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

        const patient = await createPatient(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            firstName: "Pat",
            lastName: "Two",
        });

        const caseDoc = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "custom",
        });

        const attachment = await createCaseAttachment(payload, {
            actingUser: family,
            caseID: caseDoc.id,
            description: "Family upload",
            filename: "family.pdf",
        });

        expect(relationshipToID(attachment.careGroup)).toBe(careGroup.id);

        const renamed = await payload.update({
            collection: "case-attachments",
            id: attachment.id,
            data: { displayName: "Nouveau nom" },
            user: family,
            overrideAccess: false,
        });

        expect(renamed.displayName).toBe("Nouveau nom");

        await payload.delete({
            collection: "case-attachments",
            id: attachment.id,
            user: family,
            overrideAccess: false,
            depth: 0,
        });

        const remaining = await payload.find({
            collection: "case-attachments",
            where: { case: { equals: caseDoc.id } },
            depth: 0,
            limit: 10,
            pagination: false,
            user: owner,
            overrideAccess: false,
        });

        expect(remaining.docs.length).toBe(0);
    });
});
