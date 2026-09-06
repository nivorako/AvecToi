
import type { CollectionConfig } from "payload";

// ---------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------
// A Permission represents a single application capability.
//
// Examples:
//   cases.read
//   cases.create
//   cases.update
//   tasks.read
//   tasks.create
//   messages.send
//
// IMPORTANT:
// - Permissions describe WHAT a user can do.
// - They do not describe WHERE the user can do it.
// - Scope/context rules remain in the access-control layer.
//
// This collection is intentionally independent from Users and Memberships.
// The relationship is:
//
//   User
//      ↓
//   Membership
//      ↓
//   Role
//      ↓
//   Permission
//
// Existing role-based ACLs can therefore continue to coexist while the
// application progressively migrates to the new authorization model.

export const Permissions: CollectionConfig = {
    slug: "permissions",

    admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "action", "collection", "description"],
    },

    access: {
        // Permissions are configuration data.
        // They should not be created by normal CareGroup members.
        //
        // For the MVP, we keep creation/update/delete disabled from the
        // application API and Payload admin.
        //
        // We will later decide whether a platform-level administrator
        // should manage them.
        create: () => false,
        update: () => false,
        delete: () => false,

        // Reading permissions is harmless configuration data and will be
        // useful internally when resolving Roles.
        read: ({ req }) => Boolean(req.user),
    },

    fields: [
        {
            name: "name",
            type: "text",
            required: true,
            unique: true,
            admin: {
                description:
                    'Human-readable permission name, e.g. "Consulter un dossier".',
            },
        },

        {
            name: "slug",
            type: "text",
            required: true,
            unique: true,
            index: true,
            admin: {
                description:
                    'Stable permission identifier, e.g. "cases.read".',
            },
        },

        {
            name: "collection",
            type: "text",
            required: true,
            index: true,
            admin: {
                description:
                    'Payload collection concerned by this permission, e.g. "cases".',
            },
        },

        {
            name: "action",
            type: "select",
            required: true,
            options: [
                {
                    label: "Read",
                    value: "read",
                },
                {
                    label: "Create",
                    value: "create",
                },
                {
                    label: "Update",
                    value: "update",
                },
                {
                    label: "Delete",
                    value: "delete",
                },
                {
                    label: "Manage",
                    value: "manage",
                },
            ],
            admin: {
                description:
                    "Action represented by this permission.",
            },
        },

        {
            name: "description",
            type: "textarea",
            required: false,
        },
    ],

    hooks: {
        beforeValidate: [
            async ({ data }) => {
                if (!data) return data;

                // Keep the permission identifier predictable.
                //
                // The slug is normally supplied explicitly because it is a
                // stable identifier used by application code.
                //
                // We only derive it when it is not already provided.
                if (
                    !data.slug &&
                    typeof data.collection === "string" &&
                    typeof data.action === "string"
                ) {
                    return {
                        ...data,
                        slug: `${data.collection}.${data.action}`,
                    };
                }

                return data;
            },
        ],
    },
};
