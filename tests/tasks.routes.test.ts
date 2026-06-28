import { jest } from "@jest/globals";
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
    // Helper : crée un owner + caregroup + patient + case + task
    // Le hook beforeValidate de Payload peuple automatiquement task.careGroup
    // à partir du case, ce qui permet à authorizeTask() (dans la route) de
    // retrouver le membership et de valider le rôle.
    // -------------------------------------------------------------------------
    async function seedOwnerWithTask(taskStatus = "todo") {
        const owner = (await payload.create({
            collection: "users",
            data: { email: "owner@test.com", password: "password", name: "Owner" },
            overrideAccess: true,
        })) as { id: string };

        const careGroup = (await payload.create({
            collection: "caregroups",
            data: { name: "CG" },
            overrideAccess: true,
        })) as { id: string };

        await payload.create({
            collection: "memberships",
            data: { careGroup: careGroup.id, user: owner.id, role: "owner" },
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
                type: "custom",
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

        return { owner, careGroup, task };
    }

    // -------------------------------------------------------------------------
    // Mock next/headers + fetch : pattern identique à case-attachments.routes.test.ts
    // - next/headers : simule cookies() qui retourne le token JWT
    // - fetch /api/users/me : retourne l'user courant (authentification)
    // -------------------------------------------------------------------------
    function mockAuthAs(ownerID: string) {
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
                    return Response.json({ user: { id: ownerID } });
                }
                return new Response("Not found", { status: 404 });
            },
        );
    }

    // =========================================================================
    // PATCH — mise à jour du statut
    // =========================================================================
    test("PATCH /api/tasks/:id met à jour le statut (owner)", async () => {
        const seeded = await seedOwnerWithTask();

        jest.resetModules();
        mockAuthAs(seeded.owner.id);

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
    test("PATCH /api/tasks/:id met à jour l'urgence (owner)", async () => {
        const seeded = await seedOwnerWithTask();

        jest.resetModules();
        mockAuthAs(seeded.owner.id);

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
    test("PATCH /api/tasks/:id met à jour les sous-tâches (owner)", async () => {
        const seeded = await seedOwnerWithTask();

        jest.resetModules();
        mockAuthAs(seeded.owner.id);

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
        const seeded = await seedOwnerWithTask();

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
    // DELETE — l'owner peut supprimer une tâche non terminée
    // =========================================================================
    test("DELETE /api/tasks/:id supprime la tâche (owner)", async () => {
        const seeded = await seedOwnerWithTask("todo");

        jest.resetModules();
        mockAuthAs(seeded.owner.id);

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
        const seeded = await seedOwnerWithTask("done");

        jest.resetModules();
        mockAuthAs(seeded.owner.id);

        const mod = await import("@/app/api/tasks/[id]/route");

        const req = new Request(`${ORIGIN}/api/tasks/${seeded.task.id}`, {
            method: "DELETE",
        });

        const res = await mod.DELETE(req, {
            params: Promise.resolve({ id: seeded.task.id }),
        });

        expect(res.status).toBe(400);
    });
});
