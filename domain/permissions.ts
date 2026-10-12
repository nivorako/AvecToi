// A permission describes a possible action on a resource.
//  Scope and validation rules are then handled within Access Control.
 
export const PERMISSION_OPTIONS = [
    // ─────────────────────────────────────────────
    // CareGroup
    // ─────────────────────────────────────────────
    { label: "Lire un CareGroup", value: "caregroups.read" },
    { label: "Modifier un CareGroup", value: "caregroups.update" },

    // ─────────────────────────────────────────────
    // Members
    // ─────────────────────────────────────────────
    { label: "Lire les membres", value: "members.read" },
    { label: "Gérer les membres", value: "members.manage" },

    // ─────────────────────────────────────────────
    // Invitations
    // ─────────────────────────────────────────────
    { label: "Créer une invitation", value: "invitations.create" },
    { label: "Lire les invitations", value: "invitations.read" },
    { label: "Annuler une invitation", value: "invitations.cancel" },
    { label: "Accepter une invitation", value: "invitations.accept" },

    // ─────────────────────────────────────────────
    // Patients
    // ─────────────────────────────────────────────
    { label: "Lire un patient", value: "patients.read" },
    { label: "Créer un patient", value: "patients.create" },
    { label: "Modifier un patient", value: "patients.update" },

    // ─────────────────────────────────────────────
    // Cases
    // ─────────────────────────────────────────────
    { label: "Lire un dossier", value: "cases.read" },
    { label: "Créer un dossier", value: "cases.create" },
    { label: "Modifier un dossier", value: "cases.update" },
    { label: "Archiver un dossier", value: "cases.archive" },

    // ─────────────────────────────────────────────
    // Case Informations
    // ─────────────────────────────────────────────
    {
        label: "Lire les informations d'un dossier",
        value: "caseInformations.read",
    },
    {
        label: "Créer une information de dossier",
        value: "caseInformations.create",
    },
    {
        label: "Modifier une information de dossier",
        value: "caseInformations.update",
    },

    // ─────────────────────────────────────────────
    // Case Notes
    // ─────────────────────────────────────────────
    { label: "Lire les notes", value: "caseNotes.read" },
    { label: "Créer une note", value: "caseNotes.create" },
    { label: "Modifier une note", value: "caseNotes.update" },
    { label: "Supprimer une note", value: "caseNotes.delete" },

    // ─────────────────────────────────────────────
    // Case Documents
    // ─────────────────────────────────────────────
    { label: "Lire les documents", value: "caseDocuments.read" },
    { label: "Ajouter un document", value: "caseDocuments.create" },
    { label: "Supprimer un document", value: "caseDocuments.delete" },

    // ─────────────────────────────────────────────
    // Tasks
    // ─────────────────────────────────────────────
    { label: "Lire les tâches", value: "tasks.read" },
    { label: "Créer une tâche", value: "tasks.create" },
    { label: "Modifier une tâche", value: "tasks.update" },
    { label: "Terminer une tâche", value: "tasks.complete" },

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────
    { label: "Lire les événements", value: "events.read" },
    { label: "Créer un événement", value: "events.create" },

    // ─────────────────────────────────────────────
    // Conversations
    // ─────────────────────────────────────────────
    { label: "Lire les conversations", value: "conversations.read" },
    { label: "Créer une conversation", value: "conversations.create" },
    { label: "Modifier une conversation", value: "conversations.update" },
    { label: "Archiver une conversation", value: "conversations.archive" },

    // ─────────────────────────────────────────────
    // Messages
    // ─────────────────────────────────────────────
    { label: "Lire les messages", value: "messages.read" },
    { label: "Créer un message", value: "messages.create" },
    { label: "Modifier un message", value: "messages.update" },
    { label: "Supprimer un message", value: "messages.delete" },

    // ─────────────────────────────────────────────
    // Audit Logs
    // ─────────────────────────────────────────────
    { label: "Lire les journaux d'audit", value: "auditLogs.read" },
] as const;

export type Permission =
    (typeof PERMISSION_OPTIONS)[number]["value"];

export const PERMISSIONS = PERMISSION_OPTIONS.map(
    ({ value }) => value,
);