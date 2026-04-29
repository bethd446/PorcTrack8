# Changelog Technique

## Industrialisation : Mise à jour des types de truie et correction du moteur d'alertes

### Résumé des modifications
La gestion des données de reproduction a été renforcée pour permettre une meilleure traçabilité biologique.

1.  **Interfaces (`src/types/farm.ts`)** :
    *   Ajout du champ `dateNaissance: string` à l'interface `Truie`. Cela permet de supporter les validations de maturité biologique lors des saisies de saillie.
2.  **Moteur d'Alertes (`src/services/alertEngine.ts`)** :
    *   Le type `AlertAction` a été refactorisé. Il est passé d'une union de chaînes (`'RESOLVE' | 'DISMISS' | 'POSTPONE'`) à une interface objet permettant de passer un `payload` dynamique :
        ```typescript
        export type AlertAction = {
          type: string;
          payload?: Record<string, unknown>;
        };
        ```
    *   Cette modification permet au moteur d'alerte de transmettre des données contextuelles (ex: `batchId`, `sowId`) directement à la file de confirmation.
3.  **File de confirmation (`src/services/confirmationQueue.ts`)** :
    *   Mise à jour pour aligner la gestion des confirmations sur la nouvelle structure de `AlertAction`.

### Impact et utilisation
*   **Pour les développeurs** : Lors de la création de nouvelles alertes, utilisez la nouvelle structure `AlertAction` pour transmettre des payloads.
*   **Validation biologique** : Le champ `dateNaissance` est désormais disponible sur tout objet `Truie`. Il doit être utilisé dans les composants de formulaire (comme `QuickSaillieForm`) pour valider si une truie est en âge de reproduire avant d'autoriser l'enregistrement d'une saillie.
