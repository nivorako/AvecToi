## Inscription

### Flux d'inscription

1. **Page d'inscription** (`/register`)
    - Formulaire avec : nom, email, mot de passe
    - Supporte les paramètres URL : `next` (redirection après inscription) et `email` (pré-remplissage)
    - Toggle visibilité mot de passe

2. **Route API** (`POST /api/auth/register`)
    - Validation : email et mot de passe requis
    - Vérifie si l'email existe déjà (409 si déjà utilisé)
    - Crée l'utilisateur dans Payload CMS collection `users`
    - Connecte automatiquement l'utilisateur après création
    - Définit un cookie `avectoi-token` (httpOnly, sameSite: lax)

3. **Redirection**
    - Après inscription réussie : redirection vers `/app` ou `next` si spécifié
    - En cas d'erreur : affichage message d'erreur (email déjà utilisé, erreur serveur)

### Sécurité

- Email normalisé (trim + lowercase)
- Protection Vercel bypass headers supportée
- Cookie sécurisé en production (secure: true)
