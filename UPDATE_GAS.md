# ⚠️ ACTION REQUISE — Mise à jour Google Apps Script

## Contexte

Le client PorcTrack8 a été migré : toutes les requêtes de **lecture** (qui passaient
autrefois par `doGet` avec `?token=...` en query string) passent maintenant par
`doPost` avec le token dans le **body JSON**.

Cette migration élimine la fuite du token d'authentification dans :
- les logs du serveur GAS
- l'historique du navigateur Android WebView
- les headers `Referer` de proxies d'entreprise

## Ce que tu dois faire

1. Ouvrir **Google Apps Script** → ton déploiement PorcTrack8
2. Coller le code de la section suivante **à la place de ta fonction `doGet` existante**
   (ou en complément si tu veux garder la compatibilité descendante le temps de la transition)
3. **Re-déployer** le script en tant que nouvelle version (`Déployer > Gérer les déploiements > Nouvelle version`)
4. L'URL de déploiement **ne change pas** — le client continuera à fonctionner

---

## Code GAS à coller/remplacer

```javascript
/**
 * doPost — point d'entrée unifié pour toutes les opérations PorcTrack8.
 *
 * MIGRATION SÉCURITÉ (2026-04) :
 * Les lectures (read_table_by_key, read_sheet, get_tables_index) sont désormais
 * routées ici via POST, token dans le body JSON — plus jamais dans l'URL.
 *
 * Toutes les anciennes routes POST d'écriture (update_row_by_id, append_row,
 * delete_row_by_id) sont inchangées.
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var token = body.token;
    var action = body.action;

    // ── Vérification du token ──────────────────────────────────────────────
    if (!token || token !== getConfig('PORCTRACK_TOKEN')) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }

    // ── Routage des actions ────────────────────────────────────────────────
    switch (action) {

      // ── LECTURES (nouvellement migrées depuis doGet) ─────────────────────

      case 'read_table_by_key': {
        var key = body.key;
        if (!key) return jsonResponse({ ok: false, error: 'Missing key' }, 400);
        var result = readTableByKey_(key);
        return jsonResponse({ ok: true, header: result.header, rows: result.rows, meta: result.meta });
      }

      case 'read_sheet': {
        var sheet = body.sheet;
        if (!sheet) return jsonResponse({ ok: false, error: 'Missing sheet' }, 400);
        var values = readSheet_(sheet);
        return jsonResponse({ ok: true, values: values });
      }

      case 'get_tables_index': {
        var index = getTablesIndex_();
        return jsonResponse({ ok: true, values: index });
      }

      // ── ÉCRITURES (inchangées) ────────────────────────────────────────────

      case 'update_row_by_id': {
        var updateResult = updateRowById_(body.sheet, body.idHeader, body.idValue, body.patch, body.device);
        return jsonResponse({ ok: updateResult.success, message: updateResult.message });
      }

      case 'append_row': {
        var appendResult = appendRow_(body.sheet, body.values, body.device);
        return jsonResponse({ ok: appendResult.success, message: appendResult.message });
      }

      case 'delete_row_by_id': {
        var deleteResult = deleteRowById_(body.sheet, body.idHeader, body.idValue, body.reason, body.device);
        return jsonResponse({ ok: deleteResult.success, message: deleteResult.message });
      }

      default:
        return jsonResponse({ ok: false, error: 'Unknown action: ' + action }, 400);
    }

  } catch (err) {
    logError_('doPost', err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

/**
 * doGet — CONSERVÉ pour compatibilité descendante (anciennes versions de l'app).
 * Peut être supprimé une fois que tous les appareils terrain ont reçu la mise à jour.
 *
 * ⚠️ NE PAS utiliser pour de nouveaux développements — doPost uniquement.
 */
function doGet(e) {
  var token = e.parameter.token;
  var action = e.parameter.action;

  if (!token || token !== getConfig('PORCTRACK_TOKEN')) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  switch (action) {
    case 'read_table_by_key': {
      var key = e.parameter.key;
      var result = readTableByKey_(key);
      return jsonResponse({ ok: true, header: result.header, rows: result.rows, meta: result.meta });
    }
    case 'read_sheet': {
      var values = readSheet_(e.parameter.sheet);
      return jsonResponse({ ok: true, values: values });
    }
    case 'get_tables_index': {
      return jsonResponse({ ok: true, values: getTablesIndex_() });
    }
    default:
      return jsonResponse({ ok: false, error: 'Unknown GET action' }, 400);
  }
}

// ── Helpers GAS (à adapter selon ton implémentation existante) ────────────────

/**
 * Retourne une réponse JSON avec le bon Content-Type.
 * @param {object} data  - Objet à sérialiser
 * @param {number} [status] - Code HTTP (ignoré par GAS mais utile pour la lisibilité)
 */
function jsonResponse(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lit la valeur d'une propriété de script (pour le token, les IDs de feuilles, etc.)
 * Stockée via Fichier > Propriétés du projet > Propriétés de script.
 */
function getConfig(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
```

---

## Checklist de déploiement

- [ ] Coller/fusionner le code ci-dessus dans l'éditeur GAS
- [ ] Vérifier que les fonctions helpers (`readTableByKey_`, `readSheet_`, `getTablesIndex_`,
      `updateRowById_`, `appendRow_`, `deleteRowById_`) existent dans ton script
      (elles ont probablement déjà les mêmes noms avec le suffixe `_`)
- [ ] Créer une nouvelle version du déploiement (ne pas modifier l'URL existante)
- [ ] Tester depuis `/sync` dans l'app PorcTrack8
- [ ] Une fois tous les appareils terrain mis à jour, supprimer `doGet` pour finir la migration

---

## Notes de sécurité

Le token `PORCTRACK_TOKEN` doit être stocké dans les **Propriétés de script** GAS,
**jamais** en dur dans le code source. Pour le configurer :
`Projet > Paramètres > Propriétés de script > Ajouter PORCTRACK_TOKEN = <valeur>`
