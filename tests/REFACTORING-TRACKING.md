# Suivi des tests pendant la refondation

## Tests existants à évaluer

| Fichier | Type | Statut | Action | Notes |
|---------|------|--------|--------|-------|
| `payload.integration.test.ts` | Intégration | À conserver | Adapter si besoin | Tests métier critiques |
| `case-attachments.routes.test.ts` | Routes API | À conserver | Adapter si besoin | Logique pièces jointes |
| `payloadRest.origin.test.ts` | Unit | À réévaluer | - | Peut-être obsolète |
| `components/task/*` | Composants | À réécrire | - | UI va changer |

## Commandes utiles

```bash
# Lancer un test spécifique
npm test -- tests/payload.integration.test.ts

# Lancer avec pattern
npm test -- --testNamePattern="should create"

# Mode watch
npm test -- --watch
```

## Checklist par feature refactorée

- [ ] Identifier les tests impactés
- [ ] Créer test de contrat (input/output)
- [ ] Implémenter la refonte
- [ ] Vérifier que le test de contrat passe
- [ ] Réécrire/ajuster les tests spécifiques
- [ ] Supprimer les tests obsolètes
