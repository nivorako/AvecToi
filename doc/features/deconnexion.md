## Déconnexion

### Flux de déconnexion

1. **Route API** (`POST /api/auth/logout`)
    - Supprime le cookie `avectoi-token`
    - Redirige vers `/login`

### Sécurité

- Cookie httpOnly et sameSite: lax
- Protection Vercel bypass headers supportée
- Redirection vers page de connexion après déconnexion

## Middleware de protection

### Fonctionnalités

- **Protection des routes privées** : Redirige vers `/login` si l'utilisateur n'est pas authentifié
- **Protection des routes publiques** : Redirige vers `/app` si l'utilisateur est déjà authentifié
- **Support des paramètres URL** : Gère les redirections après authentification
- **Vérification des bypass headers** : Supporte les headers Vercel pour le déploiement

### Configuration

Le middleware est configuré dans `src/middleware.ts` avec les règles suivantes :

1. **Routes publiques** (`/login`, `/register`, `/forgot-password`, `/reset-password`)
    - Accessible uniquement si l'utilisateur n'est pas authentifié
    - Redirige vers `/app` si déjà connecté

2. **Routes privées** (toutes les autres routes)
    - Accessible uniquement si l'utilisateur est authentifié
    - Redirige vers `/login` avec le paramètre `next` si non connecté

### Sécurité

- Vérification des bypass headers pour le déploiement Vercel
- Protection contre les attaques CSRF
- Gestion des cookies sécurisés (httpOnly, sameSite: lax)
