import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";

type PayloadTestClient = {
    create: (...args: unknown[]) => Promise<unknown>;
    find: (...args: unknown[]) => Promise<unknown>;
    findByID: (...args: unknown[]) => Promise<unknown>;
    update: (...args: unknown[]) => Promise<unknown>;
    delete: (...args: unknown[]) => Promise<unknown>;
    destroy?: () => Promise<void> | void;
    db?: {
        destroy?: () => Promise<void> | void;
        close?: () => Promise<void> | void;
        disconnect?: () => Promise<void> | void;
    };
};

const COOKIE_VALUE = "test-jwt";
const ORIGIN = "http://test.local";

describe("Tasks Next route handlers", () => {
    let mongod: MongoMemoryServer;
    let payload: PayloadTestClient;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn> | null = null;

    beforeAll(async () => {
        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {
                return;
            });

        mongod = await MongoMemoryServer.create();

        process.env.MONGODB_URI = mongod.getUri("payload-tests");
        process.env.PAYLOAD_SECRET =
            process.env.PAYLOAD_SECRET || "test-secret";
        process.env.NEXT_PUBLIC_SERVER_URL = ORIGIN;

        const mod = await import("payload");
        const { default: config } = await import("@/payload.config");
        payload = (await mod.getPayload({
            config,
        })) as unknown as PayloadTestClient;
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
        consoleErrorSpy?.mockRestore();
    });

    afterEach(async () => {
        jest.restoreAllMocks();

        const collections = [
            "task-attachments",
            "tasks",
            "cases",
            "patients",
            "memberships",
            "caregroups",
            "users",
        ] as const;

        for (const collection of collections) {
            const result = (await payload.find({
                collection,
                depth: 0,
                limit: 100,
                pagination: false,
                overrideAccess: true,
            })) as { docs: Array<{ id: string }> };

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

    // -------------------------------------------------------------------------
    // Helper : crée un admin + caregroup + patient + case + task
    // Le hook beforeValidate de Payload peuple automatiquement task.careGroup
    // à partir du case, ce qui permet à authorizeTask() (dans la route) de
    // retrouver le membership et de valider le rôle.
    // -------------------------------------------------------------------------
    async function seedAdminWithTask(taskStatus = "todo") {
        const admin = (await payload.create({
            collection: "users",
            data: { email: "admin@test.com", password: "password", name: "Admin" },
            overrideAccess: true,
        })) as { id: string };

        const careGroup = (await payload.create({
            collection: "caregroups",
            data: { name: "CG" },
            overrideAccess: true,
        })) as { id: string };

        await payload.create({
            collection: "memberships",
            data: { careGroup: careGroup.id, user: admin.id, role: "admin" },
            overrideAccess: true,
        });

        const patient = (await payload.create({
            collection: "patients",
            data: { careGroup: careGroup.id, firstName: "P", lastName: "L" },
            overrideAccess: true,
        })) as { id: string };

        const caseDoc = (await payload.create({
            collection: "cases",
            data: {
                title: "Case",
                type: "other",
                careGroup: careGroup.id,
                patient: patient.id,
            },
            overrideAccess: true,
        })) as { id: string };

        // Le hook beforeValidate peuple task.careGroup depuis task.case
        const task = (await payload.create({
            collection: "tasks",
            data: { title: "Task", status: taskStatus, case: caseDoc.id },
            overrideAccess: true,
        })) as { id: string; status: string };

        return { admin, careGroup, task };
    }

    // -------------------------------------------------------------------------
    // Mock next/headers + fetch : pattern identique à case-attachments.routes.test.ts
    // - next/headers : simule cookies() qui retourne le token JWT
    // - fetch /api/users/me : retourne l'user courant (authentification)
    // -------------------------------------------------------------------------
    function mockAuthAs(adminID: string) {
        jest.unstable_mockModule("next/headers", () => ({
            cookies: async () => ({
                get: (name: string) =>
                    name === "avectoi-token"
                        ? { value: COOKIE_VALUE }
                        : undefined,
            }),
        }));

        jest.spyOn(globalThis, "fetch").mockImplementation(
            async (input: RequestInfo | URL) => {
                if (String(input) === `${ORIGIN}/api/users/me`) {
                    return Response.json({ user: { id: adminID } });
                }
                return new Response("Not found", { status: 404 });
            },
        );
    }

    async function seedProfessionalTask({
        caseType,
        caseStatus = "active",
        addMembership = true,
        suffix,
    }: {
        caseType: "medical" | "other";
        caseStatus?: "active" | "archived";
        addMembership?: boolean;
        suffix: string;
    }) {
        const professional = (await payload.create({
            collection: "users",
            data: {
                email: `professional-${suffix}@test.com`,
                password: "password",
                name: "Professional",
            },
            overrideAccess: true,
        })) as { id: string };

        const careGroup = (await payload.create({
            collection: "caregroups",
            data: { name: `CG ${suffix}` },
            overrideAccess: true,
        })) as { id: string };

        if (addMembership) {
            await payload.create({
                collection: "memberships",
                data: {
                    careGroup: careGroup.id,
                    user: professional.id,
                    role: "professional",
                },
                overrideAccess: true,
            });
        }

        const patient = (await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "Patient",
                lastName: suffix,
            },
            overrideAccess: true,
        })) as { id: string };

        const caseDoc = (await payload.create({
            collection: "cases",
            data: {
                title: `Case ${suffix}`,
                type: caseType,
                status: caseStatus,
                careGroup: careGroup.id,
                patient: patient.id,
            },
            overrideAccess: true,
        })) as { id: string };

        const task = (await payload.create({
            collection: "tasks",
            data: {
                title: `Task ${suffix}`,
                status: "todo",
                case: caseDoc.id,
            },
            overrideAccess: true,
        })) as { id: string };

        return { professional, careGroup, task };
    }

    async function uploadTaskAttachment(taskID: string) {
        const formData = new FormData();
        formData.set(
            "file",
            new File(["document"], "document.pdf", {
                type: "application/pdf",
            }),
        );
        formData.set("description", "Document professionnel");

        const mod = await import("@/app/api/task-attachments/upload/route");
        return mod.POST(
            new Request(
                `${ORIGIN}/api/task-attachments/upload?task=${encodeURIComponent(taskID)}`,
                { method: "POST", body: formData },
            ),
        );
    }

    // =========================================================================
    // PATCH — mise à jour du statut
    // =========================================================================
    test("PATCH /api/tasks/:id met à jour le statut (admin)", async () => {
        const seeded = await seedAdminWithTask();

        jest.resetModules();
        mockAuthAs(seeded.admin.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "in_progress" }),
        });

        const res = await mod.PATCH(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe("in_progress");
    });

    // =========================================================================
    // PATCH — mise à jour de l'urgence
    // =========================================================================
    test("PATCH /api/tasks/:id met à jour l'urgence (admin)", async () => {
        const seeded = await seedAdminWithTask();

        jest.resetModules();
        mockAuthAs(seeded.admin.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ urgency: "high" }),
        });

        const res = await mod.PATCH(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.urgency).toBe("high");
    });

    // =========================================================================
    // PATCH — mise à jour des sous-tâches
    // =========================================================================
    test("PATCH /api/tasks/:id met à jour les sous-tâches (admin)", async () => {
        const seeded = await seedAdminWithTask();

        jest.resetModules();
        mockAuthAs(seeded.admin.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                subtasks: [
                    { title: "Préparer le dossier", completed: false },
                    { title: "Envoyer le courrier", completed: true },
                ],
            }),
        });

        const res = await mod.PATCH(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json.subtasks)).toBe(true);
        expect(json.subtasks).toHaveLength(2);
        expect(json.subtasks[0].title).toBe("Préparer le dossier");
        expect(json.subtasks[1].completed).toBe(true);
    });

    // =========================================================================
    // PATCH — refusé pour un patient (rôle insuffisant)
    // La route retourne 403 car canUpdate = false pour role "patient"
    // =========================================================================
    test("PATCH /api/tasks/:id retourne 403 pour un patient", async () => {
        const seeded = await seedAdminWithTask();

        const patientUser = (await payload.create({
            collection: "users",
            data: {
                email: "patient@test.com",
                password: "password",
                name: "Patient",
            },
            overrideAccess: true,
        })) as { id: string };

        await payload.create({
            collection: "memberships",
            data: {
                careGroup: seeded.careGroup.id,
                user: patientUser.id,
                role: "patient",
            },
            overrideAccess: true,
        });

        jest.resetModules();
        mockAuthAs(patientUser.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "done" }),
        });

        const res = await mod.PATCH(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(403);
    });

    // =========================================================================
    // DELETE — l'admin peut supprimer une tâche non terminée
    // =========================================================================
    test("DELETE /api/tasks/:id supprime la tâche (admin)", async () => {
        const seeded = await seedAdminWithTask("todo");

        jest.resetModules();
        mockAuthAs(seeded.admin.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "DELETE",
        });

        const res = await mod.DELETE(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(200);
    });

    // =========================================================================
    // DELETE — bloqué si la tâche est déjà "done"
    // Règle métier : on ne supprime pas ce qui est terminé
    // =========================================================================
    test("DELETE /api/tasks/:id retourne 400 si la tâche est déjà terminée", async () => {
        const seeded = await seedAdminWithTask("done");

        jest.resetModules();
        mockAuthAs(seeded.admin.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "DELETE",
        });

        const res = await mod.DELETE(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(400);
    });

    test("POST /api/task-attachments/upload lets a professional upload to an active medical case", async () => {
        const seeded = await seedProfessionalTask({
            caseType: "medical",
            suffix: "medical-upload",
        });

        jest.resetModules();
        mockAuthAs(seeded.professional.id);

        const res = await uploadTaskAttachment(seeded.task.id);

        expect(res.status).toBe(200);
        const created = (await res.json()) as { id: string };
        expect(created.id).toBeTruthy();

        const visible = (await payload.find({
            collection: "task-attachments",
            depth: 0,
            limit: 100,
            pagination: false,
            user: seeded.professional,
            overrideAccess: false,
        })) as { docs: Array<{ id: string }> };

        expect(visible.docs.map((doc) => doc.id)).toContain(created.id);
    });

    test("PATCH and DELETE /api/task-attachments/:id let a professional manage a medical attachment", async () => {
        const seeded = await seedProfessionalTask({
            caseType: "medical",
            suffix: "medical-manage",
        });

        jest.resetModules();
        mockAuthAs(seeded.professional.id);

        const uploadResponse = await uploadTaskAttachment(seeded.task.id);
        const attachment = (await uploadResponse.json()) as { id: string };
        const mod = await import("@/app/api/task-attachments/[id]/route");

        const patchResponse = await mod.PATCH(
            new Request(`${ORIGIN}/api/task-attachments/${attachment.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ displayName: "Nouveau nom" }),
            }),
            { params: Promise.resolve({ id: attachment.id }) },
        );

        expect(patchResponse.status).toBe(200);
        await expect(patchResponse.json()).resolves.toMatchObject({
            id: attachment.id,
            displayName: "Nouveau nom",
        });

        const deleteResponse = await mod.DELETE(
            new Request(`${ORIGIN}/api/task-attachments/${attachment.id}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: attachment.id }) },
        );

        expect(deleteResponse.status).toBe(200);
    });

    test("POST /api/task-attachments/upload denies a professional on a non-medical case", async () => {
        const seeded = await seedProfessionalTask({
            caseType: "other",
            suffix: "non-medical-upload",
        });

        jest.resetModules();
        mockAuthAs(seeded.professional.id);

        const res = await uploadTaskAttachment(seeded.task.id);

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            message:
                "Un professionnel ne peut ajouter un document qu'à une tâche médicale.",
        });
    });

    test("POST /api/task-attachments/upload denies a professional outside the task caregroup", async () => {
        const seeded = await seedProfessionalTask({
            caseType: "medical",
            addMembership: false,
            suffix: "other-caregroup-upload",
        });

        const otherCareGroup = (await payload.create({
            collection: "caregroups",
            data: { name: "Other professional CG" },
            overrideAccess: true,
        })) as { id: string };

        await payload.create({
            collection: "memberships",
            data: {
                careGroup: otherCareGroup.id,
                user: seeded.professional.id,
                role: "professional",
            },
            overrideAccess: true,
        });

        jest.resetModules();
        mockAuthAs(seeded.professional.id);

        const res = await uploadTaskAttachment(seeded.task.id);

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            message: "Aucune adhésion trouvée pour le CareGroup de cette tâche.",
        });
    });

    test("POST /api/task-attachments/upload denies uploads to an archived case", async () => {
        const seeded = await seedProfessionalTask({
            caseType: "medical",
            caseStatus: "archived",
            suffix: "archived-upload",
        });

        jest.resetModules();
        mockAuthAs(seeded.professional.id);

        const res = await uploadTaskAttachment(seeded.task.id);

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            message: "Un dossier archivé est en lecture seule.",
        });
    });
});
