## Invitations

### Concept

Le système d'invitations permet aux owners d'un CareGroup d'inviter des nouveaux membres par email. Chaque invitation contient un token unique et définit le rôle que le membre aura lors de l'acceptation.

### Structure

- **Collection Payload** : `invitations`
- **Page d'acceptation** : `/invite/[token]`
- **Relation** : belongs_to CareGroup

### Champs

- **careGroup** (relationship, required) : CareGroup auquel l'invitation est liée
- **email** (email, required) : Email de la personne invitée
- **role** (select, required) : Rôle qui sera attribué lors de l'acceptation
    - `family` : Membre famille
    - `professional` : Professionnel
    - `patient` : Patient (read-only)
- **token** (text, required, unique) : Token unique pour l'invitation
- **status** (select, required, defaultValue: "pending") :
    - `pending` : En attente d'acceptation
    - `accepted` : Acceptée
    - `revoked` : Révoquée
- **expiresAt** (date, required) : Date d'expiration de l'invitation

### Flux d'invitation

1. **Création** (par owner)
    - Formulaire avec email et rôle
    - Génération d'un token unique
    - Définition d'une date d'expiration
    - Status initial : "pending"

2. **Envoi du lien**
    - Lien d'invitation : `/invite/[token]`
    - Peut être copié depuis l'interface
    - Peut être envoyé par email (manuel)

3. **Acceptation**
    - Utilisateur non connecté : redirection vers register avec pré-remplissage email
    - Utilisateur connecté avec mauvais email : propose déconnexion ou changement de compte
    - Utilisateur connecté avec bon email : bouton d'acceptation
    - Vérifications : token valide, status pending, email correspondant, non expiré

4. **Création du membership**
    - Création automatique d'un membership avec le rôle spécifié
    - Mise à jour du status de l'invitation à "accepted"
    - Redirection vers le caregroup

### Access Control (Payload ACL)

**Création**

- Uniquement les owners du caregroup

**Lecture**

- Owners peuvent voir toutes les invitations de leurs caregroups
- Utilisateurs peuvent voir les invitations qui leur sont adressées (via leur email)

**Modification**

- Uniquement les owners du caregroup (pour révoquer)

**Suppression**

- Uniquement les owners du caregroup

### Page d'acceptation

La page `/invite/[token]` gère plusieurs scénarios :

- **Invitation introuvable** : message d'erreur + lien vers l'app
- **Utilisateur non connecté** : redirection vers register avec email pré-rempli
- **Mauvais utilisateur connecté** : message d'erreur + options (se connecter, créer compte, se déconnecter)
- **Invitation expirée/acceptée/révoquée** : message d'erreur
- **Invitation valide** : affichage des détails + bouton d'acceptation

### Composants

- **InviteMemberForm** : formulaire création d'invitation (email + rôle)
- **PendingInvitesList** : liste des invitations en attente avec copie de lien et suppression
- **WrongAccountActions** : actions quand mauvais utilisateur connecté (déconnexion)

### Sécurité

- Token unique pour chaque invitation
- Vérification de l'email correspondant
- Vérification de la date d'expiration
- Vérification du status (pending uniquement)
- Anti-tampering : validation serveur de toutes les conditions
- Payload ACL comme véritable frontière de sécurité
- Protection contre la réutilisation d'invitations (status change après acceptation)

### Rôles invités

- **Family** : peut collaborer, créer des dossiers/tâches
- **Professional** : accès limité au contenu médical
- **Patient** : lecture seule, accès aux messages
