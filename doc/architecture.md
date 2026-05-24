# Architecture du projet

## Frontend

- Next.js App Router
- TypeScript
- tailwind css

## Backend

- Payload CMS
- MongoDB

## Objectif

Application de gestion de soin pour les aidants familiaux avec patient atteint de maladie neurodégénérative qui fait perdre autonomie.
Application avec accès restreint aux utilisateurs autorisés.

## Structure

/app
->/(payload)
->(admin, api, graphql)
->/api
->(/auth, /case-attachments, /patients, /tasks)
->/app
->(toutes les pages de l'application)
->/invite
->(/invite/[token])
->/login
->(/login)
->/register
->(/register)

/components
-> composants UI réutilisables

/case-attachments
-> gestion des pièces jointes des dossiers

/lib
-> fonctions utilitaires

/doc
-> documentation du projet

/public
-> fichiers publics (images, etc.)

/tests
-> tests du projet
