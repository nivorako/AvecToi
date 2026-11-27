import type { CollectionConfig, Where } from "payload";

import type { Role } from "@/domain/roles";
import { hasPermission } from "@/access/hasPermission";  
import { getRelationshipID } from "../utils/getRelationshipID";
import { canAccessPatient } from "@/access/canAccessPatient";

export const Patients: CollectionConfig = {
    slug: "patients",

    admin: {
        useAsTitle: "fullName",
    },

    access: {
        // -------------------------------------------------------------
        // CREATE
        // Seul un admin d'un CareGroup peut créer un Patient.
        // -------------------------------------------------------------
        create: async ({ req, data }) => {
            if (!req.user) return false;

            const andConditions: Where[] = [
                {
                    user: {
                        equals: req.user.id,
                    },
                },
                {
                    role: {
                        equals: "admin",
                    },
                },
            ];

            // Lors d'une création effective, on vérifie également
            // que l'admin appartient bien au CareGroup choisi.
            if (data?.careGroup) {
                andConditions.push({
                    careGroup: {
                        equals: data.careGroup,
                    },
                });
            }

            const adminMemberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 1,
                pagination: false,
                where: {
                    and: andConditions,
                },
            });

            return adminMemberships.docs.length > 0;
        },

        // -------------------------------------------------------------
        // READ
        // Un membre ne peut lire que les Patients de ses CareGroups.
        //
        // Le cas particulier du rôle "patient" sera renforcé dans
        // canAccessPatient.ts afin qu'il ne puisse lire que SON Patient.
        // -------------------------------------------------------------
        
        read: async ({ req }) => {
            // -------------------------------------------------------------
            // 1. Utilisateur authentifié
            // -------------------------------------------------------------
            if (!req.user) return false;

            // -------------------------------------------------------------
            // 2. Récupérer toutes les Memberships de l'utilisateur
            //
            // Le rôle appartient à la Membership, et non au User.
            // Un même User peut donc avoir plusieurs rôles dans
            // plusieurs CareGroups.
            // -------------------------------------------------------------
            const memberships = await req.payload.find({
                collection: "memberships",
                depth: 0,
                limit: 100,
                pagination: false,
                where: {
                    user: {
                        equals: req.user.id,
                    },
                },
            });

            // -------------------------------------------------------------
            // 3. Construire les conditions d'accès
            // -------------------------------------------------------------
            const orConditions: Where[] = [];

            for (const membership of memberships.docs) {
                const role = membership.role as Role;

                // ---------------------------------------------------------
                // 3a. Vérifier la permission globale
                // ---------------------------------------------------------
                if (!hasPermission(role, "patients.read")) {
                    continue;
                }

                // ---------------------------------------------------------
                // 3b. Récupérer le CareGroup de la Membership
                // ---------------------------------------------------------
                const careGroupID = getRelationshipID(
                    membership.careGroup,
                );

                if (!careGroupID) continue;

                // ---------------------------------------------------------
                // 3c. Rôle patient
                //
                // Un patient ne peut lire que SON Patient.
                // Le CareGroup seul ne suffit donc pas.
                // ---------------------------------------------------------
                if (role === "patient") {
                    orConditions.push({
                        and: [
                            {
                                careGroup: {
                                    equals: careGroupID,
                                },
                            },
                            {
                                user: {
                                    equals: req.user.id,
                                },
                            },
                        ],
                    });

                    continue;
                }

                // ---------------------------------------------------------
                // 3d. Autres rôles autorisés
                //
                // admin / family / professional :
                // accès aux Patients de leur CareGroup.
                // ---------------------------------------------------------
                orConditions.push({
                    careGroup: {
                        equals: careGroupID,
                    },
                });
            }

            // -------------------------------------------------------------
            // 4. Aucune Membership donnant patients.read
            //
            // Retourne un filtre qui ne peut correspondre à aucun Patient.
            // -------------------------------------------------------------
            if (!orConditions.length) {
                return false;
            }
 
            // -------------------------------------------------------------
            // 5. Retourner le filtre Payload
            // -------------------------------------------------------------
            return {
                or: orConditions,
            };
        },
        // -------------------------------------------------------------
        // UPDATE
        // Seuls admin et family peuvent modifier un Patient.
        //
        // professional : patients.update = non
        // patient      : lecture seule
        // -------------------------------------------------------------

        update: async ({ req, id }) => {
            if (!id) return false;

            return canAccessPatient({
                req,
                patientId: id,
                permission: "patients.update",
            });
        },

        // -------------------------------------------------------------
        // DELETE
        //
        // Pas de permission patients.delete dans Permissions.ts.
        // Un Patient n'est donc jamais supprimé par cette collection.
        // -------------------------------------------------------------
    },

    fields: [
        // -------------------------------------------------------------
        // CAREGROUP
        // -------------------------------------------------------------
        {
            name: "careGroup",
            type: "relationship",
            relationTo: "caregroups",
            required: true,
        },

        // -------------------------------------------------------------
        // USER
        //
        // Optionnel :
        // - un Patient peut exister sans compte
        // - un compte peut être associé plus tard
        //
        // Le rôle "patient" reste porté par Membership.
        // -------------------------------------------------------------
        {
            name: "user",
            type: "relationship",
            relationTo: "users",
            required: false,
            unique: true,
            admin: {
                description:
                    "Compte utilisateur associé au Patient. Optionnel.",
            },
        },

        // -------------------------------------------------------------
        // IDENTITÉ
        // -------------------------------------------------------------
        {
            name: "fullName",
            type: "text",
            required: false,
            admin: {
                readOnly: true,
            },
        },

        {
            name: "firstName",
            type: "text",
            required: true,
        },

        {
            name: "lastName",
            type: "text",
            required: true,
        },

        // -------------------------------------------------------------
        // CONTACT D'URGENCE
        // -------------------------------------------------------------
        {
            name: "emergencyContact",
            type: "group",
            fields: [
                {
                    name: "name",
                    type: "text",
                    required: false,
                },
                {
                    name: "phone",
                    type: "text",
                    required: false,
                },
            ],
        },
    ],

    hooks: {
        // -------------------------------------------------------------
        // FULL NAME
        // -------------------------------------------------------------
        beforeValidate: [
            async ({ data, req, originalDoc, context, operation }) => {
                if (!data) return data;

                // ---------------------------------------------------------
                // 1. Calculer fullName
                // ---------------------------------------------------------
                const firstName =
                    typeof data.firstName === "string"
                        ? data.firstName
                        : "";

                const lastName =
                    typeof data.lastName === "string"
                        ? data.lastName
                        : "";

                const fullName =
                    `${firstName} ${lastName}`.trim();

                // ---------------------------------------------------------
                // 2. Récupérer l'ancienne valeur de user
                // ---------------------------------------------------------
                const previousUserID = originalDoc
                    ? getRelationshipID(originalDoc.user)
                    : null;

                // vérifier si l'objet data possède explicitement une propriété appelée "user".
                const userWasProvided = Object.prototype.hasOwnProperty.call(data, "user");

                // ---------------------------------------------------------
                // 3. Récupérer la nouvelle valeur de user
                // ---------------------------------------------------------
                const newUserID = userWasProvided
                    ? getRelationshipID(data.user)
                    : previousUserID;

                // ---------------------------------------------------------
                // 4. Déterminer si user est réellement modifié
                // ---------------------------------------------------------
                const userChanged =
                    userWasProvided && newUserID !== previousUserID;

                // ---------------------------------------------------------
                // 5. Création d'un Patient
                //
                // Le flux officiel est :
                //
                // Admin crée Patient
                //        ↓
                // user = null
                //        ↓
                // invitation
                //        ↓
                // association User ↔ Patient
                // ---------------------------------------------------------
               
                // if (!originalDoc) {
                //     if (newUserID) {
                //         throw new Error(
                //             "Un Patient doit être créé sans compte utilisateur. " +
                //             "L'association avec un User se fait lors du processus d'invitation.",
                //         );
                //     }

                //     return {
                //         ...data,
                //         fullName,
                //     };
                // }

                if (operation === "create") {
                    if (newUserID) {
                        throw new Error(
                            "Un Patient doit être créé sans compte utilisateur. " +
                            "L'association avec un User se fait lors du processus d'invitation.",
                        );
                    }
        
                    return {
                        ...data,
                        fullName,
                    };
                }

                // ---------------------------------------------------------
                // 6. Modification de user
                //
                // Toute modification de l'association Patient ↔ User
                // est une opération réservée à un admin.
                // ---------------------------------------------------------
                if (userChanged){
                    const isInvitationAcceptance =
                        context.invitationAcceptance === true;

                    if (isInvitationAcceptance) {
                        // Condition 1 :
                        // le Patient ne doit pas déjà avoir un User
                        if (previousUserID) {
                            throw new Error(
                                "Ce Patient possède déjà un compte utilisateur.",
                            );
                        }
                        // Condition 2 :
                        // l'acceptation doit fournir un User
                        if (!newUserID) {
                            throw new Error(
                                "L'acceptation d'une invitation doit associer un compte utilisateur.",
                            );
                        }

                        if (!req.user) {
                            throw new Error(
                                "Vous devez être authentifié pour modifier le compte associé au Patient.",
                            );
                        }

                        // Le CareGroup du Patient existant
                        const careGroupID = getRelationshipID(
                            originalDoc.careGroup,
                        );

                        if (!careGroupID) {
                            throw new Error(
                                "Impossible de déterminer le CareGroup du Patient.",
                            );
                        }

                        // Vérifier que l'utilisateur connecté est admin
                        // de ce CareGroup.
                        const adminMemberships =
                            await req.payload.find({
                                collection: "memberships",
                                depth: 0,
                                limit: 1,
                                pagination: false,
                                where: {
                                    and: [
                                        {
                                            user: {
                                                equals: req.user.id,
                                            },
                                        },
                                        {
                                            careGroup: {
                                                equals: careGroupID,
                                            },
                                        },
                                        {
                                            role: {
                                                equals: "admin",
                                            },
                                        },
                                    ],
                                },
                            });

                        if (!adminMemberships.docs.length) {
                            throw new Error(
                                "Seul un administrateur du CareGroup peut modifier le compte associé au Patient.",
                            );
                        }

                        // -----------------------------------------------------
                        // 7. Vérifier qu'un User n'est pas déjà associé
                        //    à un autre Patient : unicité
                        // -----------------------------------------------------
                        if (newUserID) {
                            const existingPatients =
                                await req.payload.find({
                                    collection: "patients",
                                    depth: 0,
                                    limit: 1,
                                    pagination: false,
                                    where: {
                                        and: [
                                            {
                                                user: {
                                                    equals: newUserID,
                                                },
                                            },
                                            {
                                                id: {
                                                    not_equals:
                                                        originalDoc.id,
                                                },
                                            },
                                        ],
                                    },
                                });

                            if (existingPatients.docs.length) {
                                throw new Error(
                                    "Ce compte utilisateur est déjà associé à un autre Patient.",
                                );
                            }
                        };
                    };
                };

                // ---------------------------------------------------------
                // 8. Retourner les données
                // ---------------------------------------------------------
                return {
                    ...data,
                    fullName,
                };
            },
        ],

        // -------------------------------------------------------------
        // COMPATIBILITÉ AVEC LES ANCIENS DOCUMENTS
        // -------------------------------------------------------------
        afterRead: [
            async ({ doc }) => {
                if (
                    typeof doc.fullName === "string" &&
                    doc.fullName.trim()
                ) {
                    return doc;
                }

                const firstName =
                    typeof doc.firstName === "string"
                        ? doc.firstName
                        : "";

                const lastName =
                    typeof doc.lastName === "string"
                        ? doc.lastName
                        : "";

                return {
                    ...doc,
                    fullName:
                        `${firstName} ${lastName}`.trim(),
                };
            },
        ],
    },
};