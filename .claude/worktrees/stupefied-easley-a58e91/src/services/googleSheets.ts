/**
 * Service de communication avec Google Sheets via Google Apps Script.
 * 
 * Pour que cela fonctionne, vous devez déployer un script Google Apps Script
 * en tant qu'application Web (Web App) avec accès "Anyone" (ou via token).
 */

const getGasConfig = () => {
  // Configurable depuis l'UI (Settings). Valeurs par défaut = connecteur PORC800 v5.
  const url = localStorage.getItem('gas_url') || 'https://script.google.com/macros/s/AKfycbyM8OfedQsGyZy6USL30wCCpUMY6NDaatl-2scDXuHabERj6hHwxaNsEhmZLmELA_fY/exec';
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

export async function fetchData(sheet: string) {
  const { url, token } = getGasConfig();
  if (!url) return { success: false, data: [] };

  try {
    // Connecteur v5: lecture complète d'une feuille
    const response = await fetch(`${url}?token=${encodeURIComponent(token)}&action=read_sheet&sheet=${encodeURIComponent(sheet)}`, {
      method: 'GET',
    });

    if (!response.ok) return { success: false, data: [] };
    const json = await response.json();
    if (!json?.ok) return { success: false, data: [] };
    // Retourne un tableau 2D "values"
    return { success: true, data: json.values || [] };
  } catch (error) {
    console.error(`Erreur de récupération Sheets (${sheet}):`, error);
    return { success: false, data: [] };
  }
}

export async function readRange(sheet: string, range: string) {
  const { url, token } = getGasConfig();
  if (!url) return { success: false, data: [] };

  try {
    const response = await fetch(`${url}?token=${encodeURIComponent(token)}&action=read_range&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`, {
      method: 'GET',
    });

    if (!response.ok) return { success: false, data: [] };
    const json = await response.json();
    if (!json?.ok) return { success: false, data: [] };
    return { success: true, data: json.values || [] };
  } catch (error) {
    console.error(`Erreur read_range Sheets (${sheet} ${range}):`, error);
    return { success: false, data: [] };
  }
}

export async function listSheets() {
  const { url, token } = getGasConfig();
  if (!url) return { success: false, data: [] };

  try {
    const response = await fetch(`${url}?token=${encodeURIComponent(token)}&action=list_sheets`, {
      method: 'GET',
    });

    if (!response.ok) return { success: false, data: [] };
    const json = await response.json();
    if (!json?.ok) return { success: false, data: [] };
    return { success: true, data: json.sheets || [] };
  } catch (error) {
    console.error('Erreur list_sheets:', error);
    return { success: false, data: [] };
  }
}

export async function appendRow(sheet: string, values: any[]) {
  const { url, token } = getGasConfig();
  const deviceInfo = getDeviceInfo();

  if (!url) {
    console.warn('URL Apps Script non configurée.');
    return { success: false, message: 'No URL' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        action: 'append_row',
        sheet,
        values,
        device: deviceInfo,
        timestamp: new Date().toISOString(),
      }),
    });

    // Important: on veut lire le JSON pour savoir si GAS a bien écrit (pas de no-cors)
    const json = await response.json().catch(() => null);
    if (!response.ok) return { success: false, message: 'HTTP_' + response.status };
    if (!json?.ok) return { success: false, message: json?.error || 'GAS_ERROR' };

    return { success: true, data: json };
  } catch (error) {
    console.error('Erreur append_row:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function postAction(payload: any) {
  const { url, token } = getGasConfig();
  const deviceInfo = getDeviceInfo();

  if (!url) return { success: false, message: 'No URL' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload, device: deviceInfo, timestamp: new Date().toISOString() }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return { success: false, message: 'HTTP_' + response.status };
    if (!json?.ok) return { success: false, message: json?.error || 'GAS_ERROR' };
    return { success: true, data: json };
  } catch (error) {
    console.error('Erreur postAction:', error);
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
