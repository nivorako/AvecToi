## Cases (Dossiers)

### Concept

Un Case (dossier thématique) appartient à exactement un Patient (et donc à un CareGroup). Il regroupe des tâches et des pièces jointes liées à un sujet spécifique (médical ou personnalisé).

### Structure

- **Collection Payload** : [cases](cci:9://file:///c:/Users/rakotondrabe/Documents/next%20js/avectoi/app/app/cases:0:0-0:0)
- **Page principale** : `/app/cases/[id]`
- **Relation** : belongs_to Patient, belongs_to CareGroup

### Champs

- **careGroup** (relationship, required) : CareGroup du case (auto-calculé depuis le patient)
- **patient** (relationship, required) : Patient associé
- **title** (text, required) : Titre du dossier
- **type** (select, required) :
    - `medical` : accessible aux professionnels
    - `custom` : non-médical (bancaire, assurance, etc.) - non accessible aux professionnels
- **description** (textarea, optional) : Description du dossier

### Hooks automatiques

**beforeValidate**

- Calcule automatiquement `careGroup` à partir du `patient` fourni
- Vérifie que le patient a un careGroup
- Garantit la cohérence des données (case toujours dans le même careGroup que son patient)

### Page de détail

La page `/app/cases/[id]` affiche :

- **Banner** : CareGroupBanner avec lien de retour
- **Tâches à faire** : 3 premières tâches (ou toutes avec `?allTodo=1`)
- **Tâches terminées** : 3 dernières tâches (ou toutes avec `?allDone=1`)
- **Pièces jointes** : Liste des documents associés
- **Description** : Description éditable (si permissions)

### Actions disponibles

**Créer une tâche** (AddCaseTaskPanel)

- Champs : titre, responsable (optionnel), date d'échéance
- Permissions : Owner/Family (tous types), Professional (medical uniquement)
- Patient : read-only (pas de création)

**Ajouter un document** (AddCaseAttachmentPanel)

- Upload de fichiers (PDF, images, etc.)
- Permissions : Owner/Family (tous types), Professional (medical uniquement)
- Patient : read-only (pas d'upload)

**Modifier la description**

- Édition de la description du case
- Permissions : Owner/Family (tous types), Professional (medical uniquement)
- Patient : read-only

### Access Control (Payload ACL)

**Création**

- Owner/Family uniquement
- Pour l'admin Payload : permet création si user est owner/family d'au moins un caregroup

**Lecture**

- Owner/Family : tous les cases dans leurs caregroups (medical + custom)
- Professional : uniquement les cases medical dans leurs caregroups
- Patient : tous les cases dans leur caregroup

**Modification**

- Owner/Family : tous les cases dans leurs caregroups
- Professional : uniquement les cases medical dans leurs caregroups
- Patient : read-only (pas de modification)

**Suppression**

- Owner/Family uniquement
- Professional : pas de suppression

### Rôles et permissions

- **Owner** : création, lecture, modification, suppression de tous les cases
- **Family** : création, lecture, modification, suppression de tous les cases
- **Professional** : lecture, modification des cases medical uniquement
- **Patient** : lecture seule de tous les cases

### Navigation

- Accès depuis le dashboard du caregroup (dossiers récents)
- Lien de retour vers le caregroup depuis la page du case
- Filtrage des tâches par statut (todo/done)

### Composants

- **AddCaseTaskPanel** : formulaire création de tâche dans un case
- **AddCaseAttachmentPanel** : panel pour upload de documents
- **CaseAttachmentRow** : affichage d'une pièce jointe
- **CaseAttachmentsUploader** : composant d'upload de fichiers

### Sécurité

- Validation serveur des permissions
- Payload ACL comme véritable frontière de sécurité
- Hook beforeValidate garantit la cohérence careGroup/patient
- Anti-tampering : vérification du rôle et du type de case
- UI cache les actions pour commodité, mais Payload ACL enforce la sécurité
