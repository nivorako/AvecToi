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

    it("patient can read cases in their caregroup (medical + other)", async () => {
        const admin = await createUser(payload, {
            email: "admin-patient-cases@example.com",
            password: "password",
            name: "Admin",
        });

        const patientUser = await createUser(payload, {
            email: "patient-cases@example.com",
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
        expect(ids).toContain(otherCase.id);
    });

    it("patient cannot update case description", async () => {
        const admin = await createUser(payload, {
            email: "admin-patient-case-update@example.com",
            password: "password",
            name: "Admin",
        });

        const patientUser = await createUser(payload, {
            email: "patient-case-update@example.com",
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
        });

        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "other",
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

    it("lets family create cases and professionals create medical cases", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-create@example.com",
            password: "password",
            name: "Admin",
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

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
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
            firstName: "A",
            lastName: "B",
        });

        const familyCase = await payload.create({
            collection: "cases",
            data: {
                careGroup: careGroup.id,
                patient: patient.id,
                title: "Family case",
                type: "other",
            },
            user: family,
            overrideAccess: false,
        });

        const professionalCase = await payload.create({
            collection: "cases",
            data: {
                careGroup: careGroup.id,
                patient: patient.id,
                title: "Dentiste",
                type: "medical",
            },
            user: professional,
            overrideAccess: false,
        });

        expect(familyCase.id).toBeTruthy();
        expect(professionalCase.id).toBeTruthy();
        expect(professionalCase.type).toBe("medical");
    });

    it("denies professionals creating non-medical cases", async () => {
        const admin = await createUser(payload, {
            email: "admin-pro-non-medical-case@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "pro-non-medical-case@example.com",
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
            firstName: "A",
            lastName: "B",
        });

        await expect(
            payload.create({
                collection: "cases",
                data: {
                    careGroup: careGroup.id,
                    patient: patient.id,
                    title: "Administrative case",
                    type: "administrative",
                },
                user: professional,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("denies professionals creating medical cases outside their caregroup", async () => {
        const admin = await createUser(payload, {
            email: "admin-pro-other-caregroup-case@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "pro-other-caregroup-case@example.com",
            password: "password",
            name: "Pro",
        });

        const professionalCareGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Professional CG",
        });
        const otherCareGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Other CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: professionalCareGroup.id,
            userID: professional.id,
            role: "professional",
        });

        const otherPatient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: otherCareGroup.id,
            firstName: "Other",
            lastName: "Patient",
        });

        await expect(
            payload.create({
                collection: "cases",
                data: {
                    careGroup: professionalCareGroup.id,
                    patient: otherPatient.id,
                    title: "Outside caregroup",
                    type: "medical",
                },
                user: professional,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("professional can read medical cases but not other cases", async () => {
        const admin = await createUser(payload, {
            email: "admin-cases@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "pro-cases@example.com",
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
            firstName: "Alice",
            lastName: "A",
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
        expect(ids).not.toContain(otherCase.id);
    });

    it("forces case.careGroup from patient.careGroup on create", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-force-create@example.com",
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

        const created = await payload.create({
            collection: "cases",
            data: {
                careGroup: cgB.id,
                patient: patientA.id,
                title: "Case",
                type: "medical",
            },
            user: admin,
            overrideAccess: false,
        });

        expect(relationshipToID(created.careGroup)).toBe(cgA.id);
    });

    it("rejects moving a case to another careGroup by changing its patient", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-force-update@example.com",
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

        const patientB = await createPatient(payload, {
            actingUser: admin,
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
            user: admin,
            overrideAccess: false,
        });

        await expect(
            payload.update({
                collection: "cases",
                id: createdCase.id,
                data: { patient: patientB.id },
                user: admin,
                overrideAccess: false,
            }),
        ).rejects.toThrow("A case cannot be moved to another careGroup");

        const unchangedCase = await payload.findByID({
            collection: "cases",
            id: createdCase.id,
            depth: 0,
            user: admin,
            overrideAccess: false,
        });

        expect(relationshipToID(unchangedCase.patient)).toBe(patientA.id);
        expect(relationshipToID(unchangedCase.careGroup)).toBe(cgA.id);
    });

    it("rejects creating a case with an invalid patient id", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-invalid-patient@example.com",
            password: "password",
            name: "Admin",
        });

        const cg = await createCareGroupAsAdmin(payload, {
            admin,
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
                user: admin,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();
    });

    it("admin can upload an attachment and derived fields are populated", async () => {
        const admin = await createUser(payload, {
            email: "admin-attachments@example.com",
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
            firstName: "Pat",
            lastName: "One",
        });

        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "other",
        });

        const attachment = await createCaseAttachment(payload, {
            actingUser: admin,
            caseID: caseDoc.id,
            description: "Doc important",
            filename: "admin.pdf",
        });

        expect(relationshipToID(attachment.careGroup)).toBe(careGroup.id);
        expect(relationshipToID(attachment.patient)).toBe(patient.id);
        expect(attachment.caseType).toBe("other");
        expect(attachment.description).toBe("Doc important");
        expect(typeof attachment.filename).toBe("string");
    });

    it("uses the current case type for professional attachment access", async () => {
        const admin = await createUser(payload, {
            email: "admin-professional-attachments@example.com",
            password: "password",
            name: "Admin",
        });

        const professional = await createUser(payload, {
            email: "professional-attachments@example.com",
            password: "password",
            name: "Professional",
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
            firstName: "Pat",
            lastName: "Pro",
        });

        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Medical case",
            type: "medical",
        });

        const attachment = await createCaseAttachment(payload, {
            actingUser: professional,
            caseID: caseDoc.id,
            filename: "professional.pdf",
        });

        await payload.update({
            collection: "cases",
            id: caseDoc.id,
            data: { type: "other" },
            user: admin,
            overrideAccess: false,
        });

        const hiddenAttachments = await payload.find({
            collection: "case-attachments",
            depth: 0,
            limit: 100,
            pagination: false,
            user: professional,
            overrideAccess: false,
        });

        expect(hiddenAttachments.docs.map((doc) => doc.id)).not.toContain(
            attachment.id,
        );
        await expect(
            payload.update({
                collection: "case-attachments",
                id: attachment.id,
                data: { displayName: "Forbidden rename" },
                user: professional,
                overrideAccess: false,
            }),
        ).rejects.toBeTruthy();

        await payload.update({
            collection: "cases",
            id: caseDoc.id,
            data: { type: "medical" },
            user: admin,
            overrideAccess: false,
        });

        const renamed = await payload.update({
            collection: "case-attachments",
            id: attachment.id,
            data: { displayName: "Allowed rename" },
            user: professional,
            overrideAccess: false,
        });

        expect(renamed.displayName).toBe("Allowed rename");
    });

    it("family can upload, rename (displayName), and delete an attachment", async () => {
        const admin = await createUser(payload, {
            email: "admin-attachments-family@example.com",
            password: "password",
            name: "Admin",
        });

        const family = await createUser(payload, {
            email: "family-attachments@example.com",
            password: "password",
            name: "Family",
        });

        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "CG",
        });

        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });

        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Pat",
            lastName: "Two",
        });

        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case",
            type: "other",
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
            user: admin,
            overrideAccess: false,
        });

        expect(remaining.docs.length).toBe(0);
    });

    it("lets an administrator archive and restore a case while list counts follow its status", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-archive@example.com",
            password: "password",
            name: "Admin",
        });
        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Archive group",
        });
        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Archive",
            lastName: "Patient",
        });
        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Case to archive",
            type: "medical",
        });

        const archived = await payload.update({
            collection: "cases",
            id: caseDoc.id,
            data: { status: "archived" },
            user: admin,
            overrideAccess: false,
        });
        expect(archived.status).toBe("archived");

        const activeAfterArchive = await payload.find({
            collection: "cases",
            where: {
                and: [
                    { careGroup: { equals: careGroup.id } },
                    { status: { not_equals: "archived" } },
                ],
            },
            depth: 0,
            limit: 50,
            user: admin,
            overrideAccess: false,
        });
        const archivedAfterArchive = await payload.find({
            collection: "cases",
            where: {
                and: [
                    { careGroup: { equals: careGroup.id } },
                    { status: { equals: "archived" } },
                ],
            },
            depth: 0,
            limit: 50,
            user: admin,
            overrideAccess: false,
        });
        expect(activeAfterArchive.docs.map((doc) => doc.id)).not.toContain(
            caseDoc.id,
        );
        expect(archivedAfterArchive.docs.map((doc) => doc.id)).toContain(
            caseDoc.id,
        );
        expect(archivedAfterArchive.docs).toHaveLength(1);

        const restored = await payload.update({
            collection: "cases",
            id: caseDoc.id,
            data: { status: "active" },
            user: admin,
            overrideAccess: false,
        });
        expect(restored.status).toBe("active");

        const archivedAfterRestore = await payload.find({
            collection: "cases",
            where: {
                and: [
                    { careGroup: { equals: careGroup.id } },
                    { status: { equals: "archived" } },
                ],
            },
            depth: 0,
            limit: 50,
            user: admin,
            overrideAccess: false,
        });
        expect(archivedAfterRestore.docs).toHaveLength(0);
    });

    it("prevents a family member from restoring an archived case", async () => {
        const admin = await createUser(payload, {
            email: "admin-case-family-restore@example.com",
            password: "password",
            name: "Admin",
        });
        const family = await createUser(payload, {
            email: "family-case-restore@example.com",
            password: "password",
            name: "Family",
        });
        const careGroup = await createCareGroupAsAdmin(payload, {
            admin,
            name: "Family restore group",
        });
        await addMembership(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            userID: family.id,
            role: "family",
        });
        const patient = await createPatient(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            firstName: "Family",
            lastName: "Patient",
        });
        const caseDoc = await createCase(payload, {
            actingUser: admin,
            careGroupID: careGroup.id,
            patientID: patient.id,
            title: "Archived case",
            type: "other",
        });
        await payload.update({
            collection: "cases",
            id: caseDoc.id,
            data: { status: "archived" },
            user: admin,
            overrideAccess: false,
        });

        await expect(
            payload.update({
                collection: "cases",
                id: caseDoc.id,
                data: { status: "active" },
                user: family,
                overrideAccess: false,
            }),
        ).rejects.toThrow(
            "Only a CareGroup administrator can change case status",
        );

        const unchanged = await payload.findByID({
            collection: "cases",
            id: caseDoc.id,
            depth: 0,
            user: admin,
            overrideAccess: false,
        });
        expect(unchanged.status).toBe("archived");
    });
});
