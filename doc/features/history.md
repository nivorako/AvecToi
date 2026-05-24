## History (Agenda/Historique)

### Concept

La page History est une vue d'agenda pour un CareGroup qui affiche toutes les tâches, divisées en tâches à faire et tâches archivées (terminées). Elle permet de voir l'historique complet des actions et de créer de nouvelles tâches.

### Structure

- **Page** : `/app/caregroups/[id]/history`
- **Accès** : Membres du caregroup
- **Filtrage** : `?all=1` pour voir toutes les tâches

### Contenu

La page affiche deux sections principales :

**Tâches à faire**

- Toutes les tâches avec status ≠ "done"
- Triées par date d'échéance (les plus urgentes en premier)
- Affichage limité à 3 par défaut (toutes avec `?all=1`)
- Lien "Voir plus/Voir moins"

**Tâches archivées**

- Toutes les tâches avec status = "done"
- Triées par date d'échéance (les plus récentes en premier)
- Affichage limité à 3 par défaut (toutes avec `?all=1`)
- Lien "Voir plus/Voir moins"

### Actions disponibles

**Créer une tâche** (AddTaskPanel)

- Formulaire avec titre, responsable, case, date d'échéance
- Disponible pour Owner, Family, Professional
- Patient : read-only (pas de création)
- Rafraîchit automatiquement la page après création

### Permissions

- **Owner** : lecture, création de tâches
- **Family** : lecture, création de tâches
- **Professional** : lecture, création de tâches
- **Patient** : lecture seule

### Tri et affichage

**Tâches à faire**

- Tri primaire : date d'échéance (croissant)
- Tri secondaire : titre (alphabétique)
- Sans date d'échéance : affichées en dernier

**Tâches archivées**

- Tri primaire : date d'échéance (décroissant)
- Tri secondaire : titre (alphabétique)
- Sans date d'échéance : affichées en premier

### Navigation

- Accessible depuis le dashboard du caregroup (lien "Agenda")
- Breadcrumbs dynamiques
- Lien de retour vers le dashboard

### Composants

- **CareGroupBanner** : banner avec nom du caregroup et breadcrumbs
- **TaskItemRow** : affichage d'une tâche avec lien vers détails
- **AddTaskPanel** : formulaire création de tâche

### Sécurité

- Vérification du membership au caregroup
- Validation serveur des permissions de création
- Payload ACL filtre les tâches selon le rôle
- Professional ne voit que les tâches des cases medical
