import type { Permission } from "./permissions";
import type { Role } from "./roles";

// associate each role with its permissions

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
    admin: [
        // CareGroup
        "caregroups.read",
        "caregroups.update",

        // Members
        "members.read",
        "members.manage",

        // Invitations
        "invitations.create",
        "invitations.read",
        "invitations.cancel",

        // Patients
        "patients.read",
        "patients.create",
        "patients.update",

        // Cases
        "cases.read",
        "cases.create",
        "cases.update",
        "cases.archive",

        // Case Informations
        "caseInformations.read",
        "caseInformations.create",
        "caseInformations.update",

        // Case Notes
        "caseNotes.read",
        "caseNotes.create",
        "caseNotes.update",
        "caseNotes.delete",

        // Case Documents
        "caseDocuments.read",
        "caseDocuments.create",
        "caseDocuments.delete",

        // Tasks
        "tasks.read",
        "tasks.create",
        "tasks.update",
        "tasks.complete",

        // Events
        "events.read",
        "events.create",

        // Conversations
        "conversations.read",
        "conversations.create",
        "conversations.update",
        "conversations.archive",

        // Messages
        "messages.read",
        "messages.create",
        "messages.update",
        "messages.delete",

        // Audit
        "auditLogs.read",
    ],

    family: [
        // CareGroup
        "caregroups.read",

        // Members
        "members.read",

        // Invitations
        "invitations.create",

        // Patients
        "patients.read",
        "patients.update",

        // Cases
        "cases.read",
        "cases.create",
        "cases.update",

        // Case Informations
        "caseInformations.read",
        "caseInformations.create",
        "caseInformations.update",

        // Case Notes
        "caseNotes.read",
        "caseNotes.create",
        "caseNotes.update",
        "caseNotes.delete",

        // Case Documents
        "caseDocuments.read",
        "caseDocuments.create",

        // Tasks
        "tasks.read",
        "tasks.create",
        "tasks.update",
        "tasks.complete",

        // Events
        "events.read",
        "events.create",

        // Conversations
        "conversations.read",
        "conversations.create",
        "conversations.update",

        // Messages
        "messages.read",
        "messages.create",
        "messages.update",
        "messages.delete",
    ],

    professional: [
        // CareGroup
        "caregroups.read",

        // Members
        "members.read",

        // Patients
        "patients.read",

        // Cases
        "cases.read",
        "cases.update",

        // Case Informations
        "caseInformations.read",
        "caseInformations.update",

        // Case Documents
        "caseDocuments.read",
        "caseDocuments.create",

        // Tasks
        "tasks.read",
        "tasks.create",
        "tasks.update",
        "tasks.complete",

        // Events
        "events.read",
        "events.create",

        // Conversations
        "conversations.read",
        "conversations.create",

        // Messages
        "messages.read",
        "messages.create",
        "messages.update",
        "messages.delete",
    ],

    patient: [
        // CareGroup
        "caregroups.read",

        // Members
        "members.read",

        // Patients
        "patients.read",

        // Cases
        "cases.read",

        // Case Informations
        "caseInformations.read",

        // Case Documents
        "caseDocuments.read",

        // Tasks
        "tasks.read",

        // Events
        "events.read",

        // Conversations
        "conversations.read",
        "conversations.create",

        // Messages
        "messages.read",
        "messages.create",
    ],
};