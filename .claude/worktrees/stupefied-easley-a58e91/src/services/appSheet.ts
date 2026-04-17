/**
 * Service de communication avec l'API AppSheet (v2)
 */

const getAppSheetConfig = () => {
  const appId = localStorage.getItem('appsheet_app_id') || 'c8bafd02-197e-41b8-b918-dd48514c1950';
  const accessKey = localStorage.getItem('appsheet_access_key') || 'V2-ELRj1-s3zVl-cBM0M-KaL3C-FppCm-sXeqy-m1EU4-ST6eC';
  return { appId, accessKey };
};

export async function fetchFromAppSheet(tableName: string) {
  const { appId, accessKey } = getAppSheetConfig();
  if (!appId || !accessKey) return { success: false, data: [] };

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  try {
    /**
     * NOTE SUR L'AUTHENTIFICATION APPSHEET :
     * Si vous obtenez une erreur "Authenticate in new window", vérifiez que :
     * 1. Votre application AppSheet est déployée.
     * 2. L'option "Require user authentication" est DÉSACTIVÉE dans Security > Require Sign-In.
     */
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: { Locale: 'fr-FR', Timezone: 'UTC' },
        Rows: []
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AppSheet API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data: data || [] };
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return { success: false, data: [] };
  }
}

export async function syncToAppSheet(tableName: string, action: 'Add' | 'Delete' | 'Edit', data: any) {
  const { appId, accessKey } = getAppSheetConfig();

  if (!appId || !accessKey) {
    console.warn('Identifiants AppSheet non configurés.');
    return { success: false, message: 'Missing credentials' };
  }

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  try {
    /**
     * NOTE SUR L'AUTHENTIFICATION APPSHEET :
     * Si vous obtenez une erreur "Authenticate in new window", vérifiez que :
     * 1. Votre application AppSheet est déployée.
     * 2. L'option "Require user authentication" est DÉSACTIVÉE dans Security > Require Sign-In.
     * 3. Votre ApplicationAccessKey est correcte.
     */
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Action: action,
        Properties: {
          Locale: 'fr-FR',
          Timezone: 'UTC',
        },
        Rows: [data]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AppSheet API Error: ${response.status} - ${errorText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur de synchronisation AppSheet:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
