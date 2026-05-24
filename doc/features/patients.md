## Patients

### Concept

Un Patient représente la personne prise en charge dans un CareGroup. Chaque patient appartient à exactement un CareGroup et peut avoir plusieurs Cases (dossiers thématiques).

### Structure

- **Collection Payload** : `patients`
- **Route API** : `/api/patients` (GET, POST, OPTIONS)
- **Relation** : belongs_to CareGroup

### Champs

- **careGroup** (relationship, required) : CareGroup auquel appartient le patient
- **fullName** (text, readOnly) : Nom complet calculé automatiquement
- **firstName** (text, required) : Prénom
- **lastName** (text, required) : Nom de famille
- **emergencyContact** (group, optional) :
    - name : Nom du contact d'urgence
    - phone : Téléphone du contact d'urgence

### Création automatique

Lors de la création d'un CareGroup :

- Un patient par défaut est créé automatiquement ("Patient Care")
- Ce patient par défaut est utilisé pour les nouveaux dossiers si aucun patient n'est spécifié

### Hooks automatiques

**beforeValidate**

- Calcule automatiquement `fullName` à partir de `firstName` + `lastName`
- S'exécute sur create/update

**afterRead**

- Fallback : si `fullName` est manquant ou vide, le calcule à la volée
- Ne persiste pas en base de données
- Utile pour les patients créés avant l'ajout du champ `fullName`

### Access Control (Payload ACL)

**Création**

- Uniquement les owners du caregroup spécifié
- Pour l'admin Payload : permet création si user est owner d'au moins un caregroup (évite de cacher le bouton "Create new")

**Lecture**

- Tous les membres du caregroup peuvent lire les patients
- Filtré par `careGroup` basé sur les memberships de l'utilisateur

**Modification**

- Owner, Family, Professional peuvent modifier
- Patient role est read-only (pas de modification)

**Suppression**

- Uniquement les owners du caregroup

### Rôles et permissions

- **Owner** : création, lecture, modification, suppression
- **Family** : lecture, modification
- **Professional** : lecture, modification
- **Patient** : lecture seule (read-only)

### Utilisation dans l'application

**Création de dossiers (Cases)**

- Les dossiers sont rattachés à un patient
- Patient par défaut utilisé si non spécifié
- Owner/Family peuvent créer des dossiers pour les patients

**Interface utilisateur**

- Les patients sont read-only pour les comptes avec rôle "patient"
- Les patients ne peuvent pas créer de tâches, uploader des documents, ou modifier des notes

### Sécurité

- Validation serveur des permissions
- Payload ACL comme véritable frontière de sécurité
- Anti-tampering : vérification que le careGroup appartient bien à l'utilisateur
- Les hooks garantissent la cohérence des données (fullName)
