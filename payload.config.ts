// Prevent this file from being imported in the browser
if (typeof window !== "undefined") {
    throw new Error("payload.config.ts should only be imported server-side");
}

import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

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
    // - `memberships`: joins users to caregroups with a role (owner/family/professional)
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

    // Database adapter (MongoDB via Mongoose).
    // `MONGODB_URI` must point to the correct DB name (case-sensitive in Atlas in some situations).
    db: mongooseAdapter({
        url: process.env.MONGODB_URI || "",
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
