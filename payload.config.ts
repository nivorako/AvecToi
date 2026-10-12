// Prevent this file from being imported in the browser
if (typeof window !== "undefined") {
    throw new Error("payload.config.ts should only be imported server-side");
}

import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import {
  commitTransaction,
  initTransaction,
  killTransaction,
} from "payload";

import { CareGroups } from "@/payload/collections/CareGroups";
import { Memberships } from "@/payload/collections/Memberships";
import { Users } from "@/payload/collections/Users";
import { Invitations } from "@/payload/collections/Invitations";
import { CaseAttachments } from "@/payload/collections/CaseAttachments";
import { CaseInformations } from "@/payload/collections/CaseInformations";
import { TaskAttachments } from "@/payload/collections/TaskAttachments";
import { Patients } from "@/payload/collections/Patients";
import { Cases } from "@/payload/collections/Cases";
import { Tasks } from "@/payload/collections/Tasks";
import { Messages } from "@/payload/collections/Messages";

import { acceptInvitation } from "@/payload/services/invitations/acceptInvitation";

export default buildConfig({
    // Payload Admin configuration
    // - `user`: the auth-enabled collection used to log into /admin
    // - `suppressHydrationWarning`: reduces noisy hydration warnings in dev when SSR markup
    //   differs slightly from client markup (common with complex admin UIs)
    admin: {
        user: "users",
        suppressHydrationWarning: true,
    },

    onInit: async (payload) => {
        const legacyAdminMemberships = await payload.find({
            collection: "memberships",
            depth: 0,
            pagination: false,
            where: {
                role: {
                    equals: "owner",
                },
            },
        });

        for (const membership of legacyAdminMemberships.docs) {
            await payload.update({
                collection: "memberships",
                id: membership.id,
                data: {
                    role: "admin",
                },
            });
        }

        const limit = 100;
        let page = 1;

        let hasMore = true;
        while (hasMore) {
            const result = await payload.find({
                collection: "patients",
                depth: 0,
                limit,
                page,
                where: {
                    or: [
                        {
                            fullName: {
                                exists: false,
                            },
                        },
                        {
                            fullName: {
                                equals: "",
                            },
                        },
                    ],
                },
            });

            if (!result.docs.length) break;

            for (const doc of result.docs) {
                const firstName =
                    typeof doc.firstName === "string" ? doc.firstName : "";
                const lastName =
                    typeof doc.lastName === "string" ? doc.lastName : "";
                const fullName = `${firstName} ${lastName}`.trim();
                if (!fullName) continue;

                await payload.update({
                    collection: "patients",
                    id: doc.id,
                    data: {
                        fullName,
                    },
                    depth: 0,
                });
            }

            hasMore = page < result.totalPages;
            page += 1;
        }

        page = 1;
        hasMore = true;
        while (hasMore) {
            const result = await payload.find({
                collection: "users",
                depth: 0,
                limit,
                page,
                where: {
                    or: [
                        {
                            name: {
                                exists: false,
                            },
                        },
                        {
                            name: {
                                equals: "",
                            },
                        },
                    ],
                },
            });

            if (!result.docs.length) break;

            for (const doc of result.docs) {
                const email = typeof doc.email === "string" ? doc.email : "";
                const derivedName = email.split("@")[0]?.trim();
                if (!derivedName) continue;

                await payload.update({
                    collection: "users",
                    id: doc.id,
                    data: {
                        name: derivedName,
                    },
                    depth: 0,
                });
            }

            hasMore = page < result.totalPages;
            page += 1;
        }
    },

    // Collections define your data model (schema), admin UI, and API endpoints.
    //
    // Multi-tenancy model (MVP):
    // - `caregroups`: tenant boundary / shared space
    // - `memberships`: joins users to caregroups with a role (admin/family/professional)
    // - `patients`: belongs to a caregroup
    // - `cases`: belongs to a patient + caregroup, and has a type (medical/custom)
    // - `tasks`: belongs to a case
    //
    // Access control strategy:
    // - Most reads are filtered by `careGroup` membership.
    // - Professionals can only see medical content.
    // - We duplicate some derived fields (ex: tasks.careGroup/tasks.caseType) to enforce ACL
    //   without doing joins at query time.
    collections: [
        Users,

        CareGroups,

        Memberships,

        Invitations,

        CaseAttachments,

        CaseInformations,

        TaskAttachments,

        Patients,

        Cases,
        
        Tasks,
    
        Messages,
        
    ],

    endpoints: [
        {
            path: "/invitations/accept",
            method: "post",
            handler: async (req) => {
                let input: {
                    token?: string;
                    email?: string;
                    password?: string;
                };

                try {
                    input = (await req.json!()) as typeof input;
                } catch {
                    return Response.json(
                        { ok: false, message: "Corps JSON invalide." },
                        { status: 400 },
                    );
                }

                const token = input.token?.trim();
                const email = input.email?.trim().toLowerCase();
                const password = input.password;

                if (
                    !token ||
                    !email ||
                    typeof password !== "string" ||
                    !password
                ) {
                    return Response.json(
                        { ok: false, message: "Données manquantes." },
                        { status: 400 },
                    );
                }


                let ownsTransaction = false;

                try {
                    // Démarre une transaction ou réutilise celle déjà présente.
                    ownsTransaction = await initTransaction(req);

                    req.payload.logger.info({
                        ownsTransaction,
                        hasTransactionID: Boolean(req.transactionID),
                        msg: "Diagnostic transaction invitation",
                    });

                    // Ne pas poursuivre si aucune transaction n'est disponible.
                    if (!ownsTransaction && !req.transactionID) {
                        throw new Error(
                            "Impossible de démarrer une transaction MongoDB.",
                        );
                    }

                    const result = await acceptInvitation(req, {
                        token,
                        email,
                        password,
                    });

                    // Seul le propriétaire de la transaction peut la valider.
                    if (ownsTransaction) {
                        await commitTransaction(req);
                    }

                    return Response.json({
                        ok: true,
                        invitationId: result.invitationId,
                    });
                } catch (error) {
                    // Une opération Payload peut déjà avoir annulé
                    // et supprimé la transaction partagée.
                    if (ownsTransaction) { 
                        await killTransaction(req);
                    }

                    req.payload.logger.error({
                        err: error,
                        msg: "Échec de l'acceptation d'une invitation.",
                    });

                    return Response.json(
                        {
                            ok: false,
                            message: "Impossible d'accepter cette invitation.",
                        },
                        { status: 400 },
                    );
                }

            },
        },
    ],

    // Database adapter (MongoDB via Mongoose).
    // `MONGODB_URI` must point to the correct DB name (case-sensitive in Atlas in some situations).
    // garantit que les index définis par le modèle sont effectivement synchronisés dans l'environnement de test/d'exécution.
    db: mongooseAdapter({
        url: process.env.MONGODB_URI || "",
        ensureIndexes: true,
    }),

    // Rich text editor adapter for Payload.
    editor: lexicalEditor({}),

    // Secret used for signing tokens/cookies, etc.
    secret: process.env.PAYLOAD_SECRET || "",

    // Server URL used in various places (links, etc). In dev it's usually http://localhost:3000
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,

    // Generates TypeScript types based on your collection schemas.
    typescript: {
        outputFile: "./payload-types.ts",
    },
});
