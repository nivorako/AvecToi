import { afterAll, afterEach, beforeAll, describe, expect, it } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
    type PayloadTestClient,
    startPayload,
    stopPayload,
    cleanCollections,
    createUser,
    createCareGroupAsAdmin,
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
        const admin = await createUser(payload, {
            email: "admin-patient-tasks@example.com",
            password: "password",
            name: "Admin",
        });

        const patientUser = await createUser(payload, {
            email: "patient-tasks@example.com",
            password: "password",
            name: "Patient",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: patientUser.id,
            role: "patient",
        });

        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "P",
            lastName: "T",
            userID: patientUser.id,
        });

        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "other",
        });

        const task = await createTask(payload, {
            actingUser: admin,
            caseID: caseDoc.id,
            title: "Admin task",
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
        const admin = await createUser(payload, {
            email: "admin-task-derived@example.com",
            password: "password",
            name: "Admin",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Bob",
            lastName: "B",
        });

        const medicalCase = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const task = await createTask(payload, {
            actingUser: admin,
            caseID: medicalCase.id,
            title: "Task",
        });

        expect(task.caseType).toBe("medical");
        expect(relationshipToID(task.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(task.patient)).toBe(patient.id);
    });

    it("professional can read medical tasks but not other tasks", async () => {
        const admin = await createUser(payload, {
            email: "admin-tasks@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "pro-tasks@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Cara",
            lastName: "C",
        });

        const medicalCase = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const otherCase = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Other",
            type: "other",
        });

        const medicalTask = await createTask(payload, {
            actingUser: admin,
            caseID: medicalCase.id,
            title: "Medical Task",
        });

        const otherTask = await createTask(payload, {
            actingUser: admin,
            caseID: otherCase.id,
            title: "Other Task",
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
        expect(ids).not.toContain(otherTask.id);
    });

    it("uses the related case type instead of the derived task caseType for professional access", async () => {
        const admin = await createUser(payload, {
            email: "admin-task-case-type-source@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "pro-task-case-type-source@example.com",
            password: "password",
            name: "Pro",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Case",
            lastName: "Type",
        });

        const medicalCase = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical",
            type: "medical",
        });

        const otherCase = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Other",
            type: "other",
        });

        const medicalTask = await createTask(payload, {
            actingUser: admin,
            caseID: medicalCase.id,
            title: "Medical Task",
        });

        const otherTask = await createTask(payload, {
            actingUser: admin,
            caseID: otherCase.id,
            title: "Other Task",
        });

        await payload.update({
            collection: "cases",
            id: medicalCase.id,
            data: { type: "other" },
            user: admin,
            overrideAccess: false,
        });

        await payload.update({
            collection: "cases",
            id: otherCase.id,
            data: { type: "medical" },
            user: admin,
            overrideAccess: false,
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
        expect(ids).not.toContain(medicalTask.id);
        expect(ids).toContain(otherTask.id);

        await expect(
            payload.update({
                collection: "tasks",
                id: medicalTask.id,
                data: { title: "Forbidden update" },
                user: professional,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();

        const updated = await payload.update({
            collection: "tasks",
            id: otherTask.id,
            data: { title: "Allowed update" },
            user: professional,
            overrideAccess: false,
        });

        expect(updated.title).toBe("Allowed update");
    });

    it("overrides task derived fields even if caller provides wrong values", async () => {
        const admin = await createUser(payload, {
            email: "admin-task-override-derived@example.com",
            password: "password",
            name: "Admin",
        });

        const cgA = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CGA",
        });
        const cgB = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CGB",
        });

        const patientA = await createPatient(payload, {
            actingUser: admin,
            careGroupID: cgA.id,
            firstName: "P",
            lastName: "A",
        });

        const caseMedical = await createCase(payload, {
            actingUser: admin,
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
                caseType: "other",
            },
            user: admin,
            overrideAccess: false,
        });

        expect(created.caseType).toBe("medical");
        expect(relationshipToID(created.careGroup)).toBe(cgA.id);
        expect(relationshipToID(created.patient)).toBe(patientA.id);
    });
});
