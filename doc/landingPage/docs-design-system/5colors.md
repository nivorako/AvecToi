# docs/design-system/05-colors.md

# Color System

Version : 1.0

**Objectif**

Les couleurs ne servent pas uniquement à embellir l'interface.

**Elles servent à :**

- guider ;
- rassurer ;
- hiérarchiser ;
- informer.

Une couleur doit toujours avoir une signification.

## 1. Les principes

### Une couleur = une fonction

Exemple :

- Le bleu représente toujours l'action principale.

- Le vert représente toujours une validation.

- Le rouge représente toujours un danger.

* On ne change jamais ces conventions.

* La couleur ne porte jamais seule l'information

* Un message d'erreur ne doit pas être uniquement rouge.

Il doit également contenir :

- une icône 

- un texte explicite.

Cela améliore l'accessibilité.

## 2. Palette fonctionnelle

Je ne choisirais pas encore les valeurs exactes.

Nous définissons d'abord les rôles.

### Primary

**Mission :**

- CTA principal ;
- liens importants ;
- focus ;
- éléments interactifs. 

**Emotion :**

Confiance.

### Secondary

**Mission :**

- éléments secondaires ;
- boutons secondaires ;
- badges.

**Emotion :**

Calme.

### Success

**Mission :**

Validation.

Exemple :

tâche terminée ;
document ajouté ;
invitation envoyée.

### Warning

**Mission :**

Attention.

Exemple :

- rendez-vous proche ;
- document manquant ;
- échéance.

### Error

**Mission :**

Urgence ou erreur.

Uniquement lorsque nécessaire.

### Information

**Mission :**

Informer.

Pas d'urgence.

## 3. Couleurs neutres

Je pense qu'elles seront les plus utilisées.

- Background

- Surface

- Border

- Divider

- Text Primary

- Text Secondary

- Disabled


Probablement :

80 % de l'application.

Les couleurs vives resteront discrètes.

## 4. Hiérarchie

Les couleurs doivent guider naturellement le regard.

Exemple :

CTA

↓

Titre

↓

Information principale

↓

Texte

↓

Information secondaire

## 5. Les émotions

Je pense que chaque couleur doit évoquer quelque chose.

| Couleur | Émotion         |
| ------- | --------------- |
| Bleu    | confiance       |
| Vert    | accompagnement  |
| Orange  | attention douce |
| Rouge   | urgence         |
| Gris    | neutralité      |

## 6. Les règles
Pas plus de trois couleurs fortes sur un écran.
Le blanc est une couleur.

Il apporte :

- sérénité ;
- lisibilité.

Les fonds restent très clairs.

L'application n'est jamais agressive.

Les couleurs fortes sont réservées aux actions.

Pas à la décoration.

## 7. Dark Mode
 
Je ne développerais pas cette version tout de suite.

Mais je choisirais des couleurs compatibles.

Ainsi, le jour où tu souhaiteras proposer un mode sombre, tu n'auras pas à tout repenser.

## 8. Les statuts

Très important.

Chaque statut doit être identifiable immédiatement.

Par exemple :

📅 Rendez-vous à venir

🟢

Terminé

🟢

En attente

🟠

Urgent

🔴

Archivé

⚪

Les couleurs doivent être cohérentes dans toute l'application.

## 9. Les composants

Exemple :

Bouton principal ==> Toujours Primary.

Bouton secondaire ==> Toujours Secondary.

Danger ==> Toujours Error.

Liens ==> Toujours Primary.

Focus clavier ==> Toujours Primary.
 
## 10. Accessibilité

**Objectif :**

Respecter les recommandations WCAG AA.

Les contrastes doivent être suffisants.

Les états de focus doivent être visibles.

Impact sur l'application actuelle

Je pense que cette section va devenir notre "checklist" de refonte.

**Par exemple :**

- Vérifier que les mêmes couleurs ont toujours la même signification.
- Uniformiser les couleurs des boutons primaires.
- Éviter les couleurs décoratives qui n'apportent pas d'information.
- Harmoniser les badges et les statuts.
- Vérifier les contrastes sur toutes les pages.