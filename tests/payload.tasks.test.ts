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
    createTask,
    relationshipToID,
} from "./helpers/payload";

describe("Payload — Tasks", () => {
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

    it("patient can read tasks in their caregroup but cannot create tasks", async () => {
        const owner = await createUser(payload, {
            email: "owner-patient-tasks@example.com",
            password: "password",
            name: "Owner",
        });

        const patientUser = await createUser(payload, {
            email: "patient-tasks@example.com",
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

        const task = await createTask(payload, {
            actingUser: owner,
            caseID: caseDoc.id,
            title: "Owner task",
        });

        const read = await payload.find({
            collection: "tasks",
            depth: 0,
            limit: 100,
            pagination: false,
            user: patientUser,
            overrideAccess: false,
        });

        expect(read.docs.map((d) => d.id)).toContain(task.id);

        await expect(
            payload.create({
                collection: "tasks",
                data: { case: caseDoc.id, title: "Patient task", status: "todo" },
                user: patientUser,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("task.beforeValidate populates derived fields (careGroup/patient/caseType)", async () => {
        const owner = await createUser(payload, {
            email: "owner-task-derived@example.com",
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
            firstName: "Bob",
            lastName: "B",
        });

        const medicalCase = await createCase(payload, {
            actingUser: owner,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const task = await createTask(payload, {
            actingUser: owner,
            caseID: medicalCase.id,
            title: "Task",
        });

        expect(task.caseType).toBe("medical");
        expect(relationshipToID(task.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(task.patient)).toBe(patient.id);
    });

    it("professional can read medical tasks but not custom tasks", async () => {
        const owner = await createUser(payload, {
            email: "owner-tasks@example.com",
            password: "password",
            name: "Owner",
        });

        const professional = await createUser(payload, {
            email: "pro-tasks@example.com",
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
            firstName: "Cara",
            lastName: "C",
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

        const medicalTask = await createTask(payload, {
            actingUser: owner,
            caseID: medicalCase.id,
            title: "Medical Task",
        });

        const customTask = await createTask(payload, {
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

    it("overrides task derived fields even if caller provides wrong values", async () => {
        const owner = await createUser(payload, {
            email: "owner-task-override-derived@example.com",
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

        const caseMedical = await createCase(payload, {
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
