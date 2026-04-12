/**
 * Service de communication avec Google Sheets via Google Apps Script.
 * 
 * Pour que cela fonctionne, vous devez déployer un script Google Apps Script
 * en tant qu'application Web (Web App) avec accès "Anyone" (ou via token).
 */

const getGasConfig = () => {
  const url = localStorage.getItem('gas_url') || 'https://script.google.com/macros/s/AKfycbyaSeQ0mGHN8oP5R7UOMXy_-4OMNhtidl-5LDXFDT3GkGfm4pgb216TfybJ-ILgCKv0iw/exec';
  const token = localStorage.getItem('gas_token') || 'PORC800_WRITE_2026';
  return { url, token };
};

const getDeviceInfo = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('device_id', deviceId);
  }
  
  const userAgent = navigator.userAgent;
  let brand = "Inconnu";
  if (userAgent.match(/iPhone/i)) brand = "iPhone";
  else if (userAgent.match(/Samsung/i)) brand = "Samsung";
  else if (userAgent.match(/Android/i)) brand = "Android";
  
  return {
    deviceId,
    brand,
    model: navigator.platform,
    role: localStorage.getItem('user_role') || 'USER'
  };
};

export async function fetchData(table: string) {
  const { url, token } = getGasConfig();
  if (!url) return { success: false, data: [] };

  try {
    // Note: doGet must be implemented in GAS to return JSON data
    const response = await fetch(`${url}?token=${token}&table=${table}&action=SELECT`, {
      method: 'GET',
    });
    
    if (!response.ok) return { success: false, data: [] };
    const data = await response.json();
    return { success: true, data: data || [] };
  } catch (error) {
    console.error(`Erreur de récupération Sheets (${table}):`, error);
    return { success: false, data: [] };
  }
}

export async function syncData(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
  const { url, token } = getGasConfig();
  const deviceInfo = getDeviceInfo();
  
  if (!url) {
    console.warn('URL Apps Script non configurée.');
    return { success: false, message: 'No URL' };
  }

  try {
    /**
     * NOTE SUR L'AUTHENTIFICATION :
     * Si vous obtenez une erreur "Authenticate in new window", cela signifie que votre
     * script Google Apps Script n'est pas déployé correctement.
     * 
     * SOLUTIONS :
     * 1. Déployez en tant qu'Application Web.
     * 2. Exécuter en tant que : "Moi" (votre compte).
     * 3. Qui a accès : "Tout le monde" (Anyone).
     * 4. Assurez-vous d'avoir cliqué sur "Autoriser l'accès" lors du déploiement.
     */
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Requis pour éviter les erreurs CORS avec GAS
      headers: {
        'Content-Type': 'text/plain', // Utiliser text/plain pour éviter le preflight OPTIONS
      },
      body: JSON.stringify({
        token: token,
        table,
        action,
        payload: data,
        device: deviceInfo,
        timestamp: new Date().toISOString()
      })
    });

    // Avec no-cors, on ne peut pas lire la réponse, on assume le succès si pas d'exception
    return { success: true };
  } catch (error) {
    console.error('Erreur de synchronisation Sheets:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Exemple de code Google Apps Script (ConnecteurV4) :
 * 
 * function doPost(e) {
 *   var data = JSON.parse(e.postData.contents);
 *   if (data.token !== "PORC800_WRITE_2026") return ContentService.createTextOutput("Unauthorized");
 *   
 *   var ss = SpreadsheetApp.getActiveSpreadsheet();
 *   var sheet = ss.getSheetByName(data.table);
 *   
 *   // Logique d'insertion/mise à jour ici...
 *   sheet.appendRow([new Date(), JSON.stringify(data.payload)]);
 *   
 *   return ContentService.createTextOutput("Success");
 * }
 */
