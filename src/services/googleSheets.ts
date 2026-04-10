/**
 * Service de communication avec Google Sheets via Google Apps Script.
 * 
 * Pour que cela fonctionne, vous devez déployer un script Google Apps Script
 * en tant qu'application Web (Web App) avec accès "Anyone" (ou via token).
 */

const getGasConfig = () => {
  const url = localStorage.getItem('gas_url') || import.meta.env.VITE_GAS_URL || '';
  const token = localStorage.getItem('gas_token') || import.meta.env.VITE_GAS_TOKEN || 'PORC800_WRITE_2026';
  return { url, token };
};

export async function syncData(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
  const { url, token } = getGasConfig();
  
  if (!url) {
    console.warn('URL Apps Script non configurée. Synchronisation désactivée.');
    return { success: false, message: 'No URL' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Souvent nécessaire pour GAS
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        table,
        action,
        payload: data,
        timestamp: new Date().toISOString()
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur de synchronisation Sheets:', error);
    throw error;
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
