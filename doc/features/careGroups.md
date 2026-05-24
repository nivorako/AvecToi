## CareGroups (Groupes de soins)

### Concept

Un CareGroup est l'espace de travail partagé pour une famille (et éventuellement des professionnels). Tous les contenus sensibles de l'application sont scoped par `careGroup` (multi-tenancy).

### Structure

- **Page principale** : `/app/caregroups/[id]`
- **Dashboard** avec vue d'ensemble des tâches, dossiers et messages
- **Navigation** : breadcrumbs dynamiques selon la section active

### Création automatique

Lors de la création d'un CareGroup :

- Création automatique d'un membership `owner` pour le créateur
- Création automatique d'un patient par défaut ("Patient Care")

### Dashboard

Le dashboard affiche :

- **Banner** : nom du caregroup + message de bienvenue personnalisé
- **Prochaines tâches** : 3 tâches à venir triées par date d'échéance
- **Dossiers récents** : 3 derniers dossiers avec code couleur par ID
- **Messages récents** : (à venir)

### Actions disponibles

**Créer un dossier** (AddDossierPanel)

- Owner/Family uniquement
- Champs : titre, type (medical/custom)
- Attache automatiquement au patient par défaut du caregroup

**Créer une tâche** (AddTaskPanel)

- Owner/Family/Professional
- Champs : titre, responsable (optionnel), case, date d'échéance
- Professional limité aux cases médicales uniquement

### Access Control (Payload ACL)

**Lecture**

- Uniquement les caregroups où l'utilisateur a un membership

**Création**

- Tout utilisateur connecté peut créer un caregroup

**Modification/Suppression**

- Uniquement les owners du caregroup

### Rôles et permissions UI

- **Owner** : gestion complète, création de dossiers/tâches
- **Family** : collaboration, création de dossiers/tâches
- **Professional** : création de tâches (cases médicales uniquement)
- **Patient** : lecture seule, pas de création

### Navigation interne

Sections accessibles depuis un caregroup :

- `/app/caregroups/[id]` - Dashboard principal
- `/app/caregroups/[id]/dossiers` - Liste des dossiers
- `/app/caregroups/[id]/history` - Agenda/historique
- `/app/caregroups/[id]/messages` - Messages
- `/app/caregroups/[id]/calendar` - Calendrier
- `/app/caregroups/[id]/members` - Gestion des membres
- `/app/caregroups/[id]/emergency` - Urgences

### Composants

- **CareGroupBanner** : banner avec nom du caregroup et breadcrumbs
- **CareGroupBreadcrumbs** : navigation fil d'ariane dynamique
- **AddDossierPanel** : formulaire création dossier
- **AddTaskPanel** : formulaire création tâche

### Sécurité

- Validation serveur des permissions (anti-tampering)
- Vérification que le case appartient au caregroup avant création de tâche
- Payload ACL comme véritable frontière de sécurité
- UI cache seulement les actions pour commodité
