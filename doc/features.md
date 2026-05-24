#Features

## Patients

Appartiennent à un careGroup
Informations : nom, prénom
Patient par défaut créé automatiquement avec le careGroup

## Cases (Dossiers)

Appartiennent à un patient + careGroup
Types : medical (visible par professionnels) ou custom
Pièces jointes (documents, images)

## Tasks (Tâches)

Rattachées à un case
Avec responsable, date d'échéance, statut
Permissions basées sur le rôle (professionnels = tâches médicales uniquement)

## Invitations

Inviter par email avec rôle spécifique
Token unique avec expiration
Flux d'acceptation / rejet

## Messages

Communication au sein du careGroup
Entre membres

## Calendrier

Vue des tâches et événements
Par careGroup

## Emergency

Section urgences
Informations critiques accessibles rapidement

## History

Historique des actions
Traçabilité

## Rôles et permissions

Owner : gestion complète du careGroup
Family : collaboration, création de tâches
Professional : lecture seule sur contenu médical, tâches médicales uniquement
Patient : lecture seule, messages
