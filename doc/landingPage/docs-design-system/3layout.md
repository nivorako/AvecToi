# Layout System

## 1. Objectif

Le système de layout définit comment les informations sont organisées dans l'espace.

Pour CareGroup, le layout doit transmettre :

simplicité ;
calme ;
clarté ;
hiérarchie.

L'utilisateur ne doit jamais être submergé.

## 2. Principe général

L'espace est une information

Nous utilisons l'espace vide pour :

séparer les idées ;
réduire la charge cognitive ;
guider le regard.

Une interface trop dense augmente le stress de l'utilisateur.

## 3. Container principal

Toutes les pages utilisent un container central.

Desktop :

┌───────────────────────────────────────┐
│                                       │
│        Contenu de la page             │
│                                       │
└───────────────────────────────────────┘

Règle :

max-width: 1200px;
margin: 0 auto;
padding-inline: 24px;

Pourquoi ?

Parce que les écrans larges ne doivent pas étirer les informations.

## 4. Grid system

Nous utilisons une grille de 12 colonnes.

Desktop :

|--|--|--|--|--|--|--|--|--|--|--|--|


Cela permet :

pages simples ;
pages avec sidebar ;
cartes ;
tableaux de bord.

Exemples :

Landing Hero
┌──────────────┬──────────────┐
│              │              │
│ Texte        │ Illustration │
│              │              │
└──────────────┴──────────────┘

50 / 50

Section fonctionnalité
┌──────────────┬──────────────┐
│ Capture app  │ Explication  │
└──────────────┴──────────────┘

60 / 40 possible.

## 5. Spacing System

Nous utilisons une échelle basée sur 8px.

4px
8px
16px
24px
32px
48px
64px
96px
128px

Utilisation :

**Petite séparation : 8px**

Entre :

icône et texte ;
label et champ.

**Séparation normale : 24px / 32px**

Entre :

éléments d'une carte ;
boutons.

**Grande séparation : 64px / 96px**

Entre :

sections importantes ;
blocs de landing page.

## 6. Vertical Rhythm

Une page CareGroup doit respirer.

**Règle :** Chaque grande section possède :

- Desktop : padding-block: 96px;

- Tablet : padding-block: 64px;

- Mobile : padding-block: 48px;

**Exemple landing :**

Hero

↓ 96px

Problème

↓ 96px

CareGroup

↓ 96px

Fonctionnalités

## 7. Cards Layout

Les cartes sont très présentes dans ton application.

**Règles :**

Une carte contient :

┌─────────────────────┐
│ Icône               │
│                     │
│ Titre               │
│                     │
│ Description courte  │
│                     │
│ Action éventuelle   │
└─────────────────────┘

**Principes :**

une idée par carte ;
pas trop de texte ;
beaucoup d'espace interne.

## 8. Responsive Design

**Principe : Mobile First**

Pourquoi ?

Parce que beaucoup de membres d'une famille utiliseront l'application depuis leur téléphone.

Breakpoints proposés :

**Mobile**

< 640px


**Tablet**

640px - 1024px


**Desktop**

> 1024px

## 9. Mobile Layout

**Sur mobile :** Toutes les colonnes deviennent verticales.

Exemple :

- Desktop :

Texte | Image

- Mobile :

Texte

↓

Image

- Navigation :

Desktop :

Logo | Menu | Actions

Mobile :

Logo | Menu

## 10. Dashboard Application

Pour l'application elle-même :

Nous distinguons deux layouts.

Public

Landing / pages marketing

Header

Content

Footer
Application

Interface connectée

Header

Sidebar / Navigation

Main Content

## 11. Priorité visuelle

Chaque écran doit avoir une hiérarchie claire.

Ordre :

1. Action importante

↓

2. Information principale

↓

3. Informations secondaires

↓

4. Détails

12. Règle spécifique CareGroup

Une information importante doit être retrouvable rapidement.

Exemples :

prochain rendez-vous ;
tâche urgente ;
information sécurité ;
message important.

L'utilisateur ne doit pas fouiller.

Résumé des règles Layout
Règle	Objectif
Container limité	Lecture confortable
Grille 12 colonnes	Flexibilité
Espacement 8px	Cohérence
Beaucoup d'espace	Sérénité
Mobile First	Accessibilité
Une idée par bloc	Compréhension
Hiérarchie forte	Réduction du stress

