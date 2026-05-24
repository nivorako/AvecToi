## Connexion

### Flux de connexion

1. **Page de connexion** (`/login`)
    - Formulaire avec : email, mot de passe
    - Toggle visibilité mot de passe
    - Lien "Mot de passe oublié"

2. **Route API** (`POST /api/auth/login`)
    - Validation : email et mot de passe requis
    - Vérification credentials via Payload CMS
    - Définit un cookie `avectoi-token` (httpOnly, sameSite: lax)

3. **Redirection**
    - Après connexion réussie : redirection vers `/app` ou `next` si spécifié
    - En cas d'erreur : affichage message d'erreur (identifiants invalides)

### Sécurité

- Protection Vercel bypass headers supportée
- Cookie sécurisé en production (secure: true)
- Payload CMS gère l'authentification et la validation des credentials
