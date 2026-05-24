## Tasks (Tâches)

### Concept

Une Task représente une action à accomplir liée à un Case (dossier). Les champs dérivés (`careGroup`, `patient`, `caseType`) sont stockés directement dans la task pour permettre l'access control sans faire de joins à query time.

### Structure

- **Collection Payload** : [tasks](cci:9://file:///c:/Users/rakotondrabe/Documents/next%20js/avectoi/app/app/tasks:0:0-0:0)
- **Page de détail** : `/app/tasks/[id]` (basique)
- **Relation** : belongs_to Case, belongs_to CareGroup (dérivé), belongs_to Patient (dérivé)

### Champs

- **careGroup** (relationship, required, readOnly, sidebar) : CareGroup dérivé du case
- **patient** (relationship, required, readOnly, sidebar) : Patient dérivé du case
- **case** (relationship, required) : Case auquel la tâche est rattachée
- **caseType** (select, required, readOnly, sidebar) :
    - `medical` : case médical
    - `custom` : case personnalisé
- **title** (text, required) : Titre de la tâche
- **responsable** (text, optional) : Responsable de la tâche
- **status** (select, required, defaultValue: "todo") :
    - `todo` : à faire
    - `in_progress` : en cours
    - `done` : terminé
- **dueDate** (date, optional) : Date d'échéance
- **assignedTo** (relationship to users, optional) : Utilisateur assigné

### Hooks automatiques

**beforeValidate**

- Calcule automatiquement `careGroup`, `patient`, `caseType` à partir du [case](cci:9://file:///c:/Users/rakotondrabe/Documents/next%20js/avectoi/components/case:0:0-0:0) fourni
- Stocke ces champs dérivés pour éviter les joins à query time
- Permet un access control performant basé sur ces champs dérivés

### Access Control (Payload ACL)

**Création**

- Owner/Family : peuvent créer des tâches dans leurs caregroups
- Professional : peut créer des tâches uniquement pour les cases medical
- Patient : read-only (pas de création)

**Lecture**

- Owner/Family : toutes les tâches dans leurs caregroups
- Professional : uniquement les tâches des cases medical dans leurs caregroups
- Patient : toutes les tâches dans leur caregroup

**Modification**

- Owner/Family : toutes les tâches dans leurs caregroups
- Professional : uniquement les tâches des cases medical dans leurs caregroups
- Patient : read-only (pas de modification)

**Suppression**

- Owner/Family uniquement
- Professional : pas de suppression
- Patient : read-only (pas de suppression)

### Rôles et permissions

- **Owner** : création, lecture, modification, suppression de toutes les tâches
- **Family** : création, lecture, modification, suppression de toutes les tâches
- **Professional** : lecture, modification des tâches des cases medical uniquement
- **Patient** : lecture seule de toutes les tâches

### Utilisation dans l'application

**Dashboard CareGroup**

- Affichage des 3 prochaines tâches triées par date d'échéance
- Owner/Family/Professional peuvent créer des tâches
- Patient : read-only

**Page de Case**

- Liste des tâches du case (todo et done)
- Filtrage par statut avec `?allTodo=1` et `?allDone=1`
- Création de tâches contextuelle au case

### Composants

- **TaskItemRow** : affichage d'une tâche avec titre, date et lien vers détails
- **AddTaskPanel** : formulaire création de tâche (CareGroup)
- **AddCaseTaskPanel** : formulaire création de tâche (Case)

### Sécurité

- Validation serveur des permissions
- Payload ACL comme véritable frontière de sécurité
- Hook beforeValidate garantit la cohérence des champs dérivés
- Anti-tampering : vérification du rôle et du caseType
- Champs dérivés pour access control performant sans joins
