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

describe("Case attachments Next route handlers", () => {
    let mongod: MongoMemoryServer;
    let payload: PayloadTestClient;
    let consoleInfoSpy: ReturnType<typeof jest.spyOn> | null = null;
    let consoleWarnSpy: ReturnType<typeof jest.spyOn> | null = null;
    let consoleErrorSpy: ReturnType<typeof jest.spyOn> | null = null;

    beforeAll(async () => {
        consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {
            return;
        });
        consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
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

        consoleInfoSpy?.mockRestore();
        consoleWarnSpy?.mockRestore();
        consoleErrorSpy?.mockRestore();
    });

    afterEach(async () => {
        jest.restoreAllMocks();

        // Best-effort cleanup to keep tests independent.
        const collections = [
            "case-attachments",
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

    async function seedOwnerWithAttachment() {
        const owner = (await payload.create({
            collection: "users",
            data: {
                email: "owner@example.com",
                password: "password",
                name: "Owner",
            },
            overrideAccess: true,
        })) as { id: string };

        const careGroup = (await payload.create({
            collection: "caregroups",
            data: {
                name: "CG",
            },
            overrideAccess: true,
        })) as { id: string };

        await payload.create({
            collection: "memberships",
            data: {
                careGroup: careGroup.id,
                user: owner.id,
                role: "owner",
            },
            overrideAccess: true,
        });

        const patient = (await payload.create({
            collection: "patients",
            data: {
                careGroup: careGroup.id,
                firstName: "P",
                lastName: "L",
            },
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

        const attachment = (await payload.create({
            collection: "case-attachments",
            data: {
                displayName: "Initial",
                description: "",
                case: caseDoc.id,
            },
            file: {
                data: Buffer.from("hello"),
                mimetype: "text/plain",
                name: "f.txt",
                size: 5,
            },
            overrideAccess: true,
        })) as {
            id: string;
            url?: string;
            filename?: string;
            mimeType?: string;
        };

        return { owner, careGroup, patient, caseDoc, attachment };
    }

    test("GET /api/case-attachments/:id/file returns the file (proxy)", async () => {
        const seeded = await seedOwnerWithAttachment();

        jest.resetModules();

        // Mock next/headers cookies() for this module import.
        await jest.unstable_mockModule("next/headers", () => ({
            cookies: async () => ({
                get: (name: string) =>
                    name === "avectoi-token"
                        ? { value: COOKIE_VALUE }
                        : undefined,
            }),
        }));

        // Mock fetch for /api/users/me + the file URL.
        jest.spyOn(globalThis, "fetch").mockImplementation(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input);

                if (url === `${ORIGIN}/api/users/me`) {
                    const authHeader = (
                        init?.headers as Record<string, string> | undefined
                    )?.Authorization;
                    if (authHeader !== `JWT ${COOKIE_VALUE}`) {
                        return new Response("Unauthorized", { status: 401 });
                    }
                    return Response.json({ user: { id: seeded.owner.id } });
                }

                if (url === `${ORIGIN}${seeded.attachment.url ?? ""}`) {
                    return new Response("hello", {
                        status: 200,
                        headers: {
                            "content-type": "text/plain",
                            "content-disposition": 'inline; filename="f.txt"',
                        },
                    });
                }

                return new Response("Not found", { status: 404 });
            },
        );

        const mod = await import("@/app/api/case-attachments/[id]/file/route");

        const res = await mod.GET(
            new Request(
                `${ORIGIN}/api/case-attachments/${seeded.attachment.id}/file`,
            ),
            {
                params: Promise.resolve({ id: seeded.attachment.id }),
            },
        );

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/plain");
        const text = await res.text();
        expect(text).toBe("hello");
    });

    test("PATCH /api/case-attachments/:id renames attachment", async () => {
        const seeded = await seedOwnerWithAttachment();

        jest.resetModules();

        await jest.unstable_mockModule("next/headers", () => ({
            cookies: async () => ({
                get: (name: string) =>
                    name === "avectoi-token"
                        ? { value: COOKIE_VALUE }
                        : undefined,
            }),
        }));

        jest.spyOn(globalThis, "fetch").mockImplementation(
            async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url === `${ORIGIN}/api/users/me`) {
                    return Response.json({ user: { id: seeded.owner.id } });
                }
                return new Response("Not found", { status: 404 });
            },
        );

        const mod = await import("@/app/api/case-attachments/[id]/route");

        const req = new Request(
            `${ORIGIN}/api/case-attachments/${seeded.attachment.id}`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ displayName: "Renamed" }),
            },
        );

        const res = await mod.PATCH(req, {
            params: Promise.resolve({ id: seeded.attachment.id }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.displayName).toBe("Renamed");
    });

    test("DELETE /api/case-attachments/:id deletes attachment", async () => {
        const seeded = await seedOwnerWithAttachment();

        jest.resetModules();

        await jest.unstable_mockModule("next/headers", () => ({
            cookies: async () => ({
                get: (name: string) =>
                    name === "avectoi-token"
                        ? { value: COOKIE_VALUE }
                        : undefined,
            }),
        }));

        jest.spyOn(globalThis, "fetch").mockImplementation(
            async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url === `${ORIGIN}/api/users/me`) {
                    return Response.json({ user: { id: seeded.owner.id } });
                }
                return new Response("Not found", { status: 404 });
            },
        );

        const mod = await import("@/app/api/case-attachments/[id]/route");

        const req = new Request(
            `${ORIGIN}/api/case-attachments/${seeded.attachment.id}`,
            {
                method: "DELETE",
            },
        );

        const res = await mod.DELETE(req, {
            params: Promise.resolve({ id: seeded.attachment.id }),
        });

        expect(res.status).toBe(200);

        // Verify it is gone.
        await expect(
            payload.findByID({
                collection: "case-attachments",
                id: seeded.attachment.id,
                overrideAccess: true,
            }),
        ).rejects.toBeTruthy();
    });

    test("DELETE /api/case-attachments/:id falls back when file deletion fails", async () => {
        const seeded = await seedOwnerWithAttachment();

        jest.resetModules();

        await jest.unstable_mockModule("next/headers", () => ({
            cookies: async () => ({
                get: (name: string) =>
                    name === "avectoi-token"
                        ? { value: COOKIE_VALUE }
                        : undefined,
            }),
        }));

        jest.spyOn(globalThis, "fetch").mockImplementation(
            async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url === `${ORIGIN}/api/users/me`) {
                    return Response.json({ user: { id: seeded.owner.id } });
                }
                return new Response("Not found", { status: 404 });
            },
        );

        class ErrorDeletingFile extends Error {
            override name = "ErrorDeletingFile";
        }

        const deleteSpy = jest
            .spyOn(
                payload as unknown as { delete: () => Promise<unknown> },
                "delete",
            )
            .mockRejectedValue(
                new ErrorDeletingFile("There was an error deleting file."),
            );

        const deleteOne = jest
            .fn<() => Promise<{ deletedCount: number }>>()
            .mockResolvedValue({ deletedCount: 1 });

        const payloadAny = payload as unknown as {
            db?: { collections?: Record<string, unknown> };
        };
        const collections = payloadAny.db?.collections as
            | Record<string, unknown>
            | undefined;

        if (!collections) {
            throw new Error(
                "Missing payload.db.collections in test payload client",
            );
        }

        const existingModel =
            collections["case-attachments"] ??
            Object.values(collections).find(
                (m) =>
                    typeof m === "object" &&
                    m !== null &&
                    ((m as { collection?: { collectionName?: string } })
                        .collection?.collectionName === "case-attachments" ||
                        (m as { collection?: { collectionName?: string } })
                            .collection?.collectionName ===
                            "case-attachments" + "s"),
            );

        const modelAny = existingModel as unknown as {
            deleteOne?: (filter: {
                _id: string;
            }) => Promise<{ deletedCount?: number }>;
            collection?: { collectionName?: string };
        };

        const hadDeleteOne = typeof modelAny.deleteOne === "function";
        const originalDeleteOne = modelAny.deleteOne;

        if (hadDeleteOne) {
            modelAny.deleteOne = deleteOne;
        } else {
            collections["case-attachments"] = {
                collection: { collectionName: "case-attachments" },
                deleteOne,
            };
        }

        const mod = await import("@/app/api/case-attachments/[id]/route");

        const req = new Request(
            `${ORIGIN}/api/case-attachments/${seeded.attachment.id}`,
            {
                method: "DELETE",
            },
        );

        const res = await mod.DELETE(req, {
            params: Promise.resolve({ id: seeded.attachment.id }),
        });

        expect(res.status).toBe(200);
        const json = (await res.json()) as {
            id: string;
            deleted: boolean;
            fileDeleted: boolean;
        };
        expect(json).toEqual({
            id: seeded.attachment.id,
            deleted: true,
            fileDeleted: false,
        });
        expect(deleteOne).toHaveBeenCalledWith({ _id: seeded.attachment.id });

        deleteSpy.mockRestore();

        if (hadDeleteOne) {
            modelAny.deleteOne = originalDeleteOne;
        } else {
            delete (collections as Record<string, unknown>)["case-attachments"];
        }
    });
});
