import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeFarmState(animals: any[], stock: any[]) {
  const prompt = `
    En tant qu'expert en gestion porcine (spécialiste Large White, Côte d'Ivoire), analyse les données de la ferme et fournis 3 conseils stratégiques basés sur les standards De Heus/Koudijs et les conseils de Max Farmer.
    
    Données Cheptel: ${JSON.stringify(animals.map(a => ({ id: a.id, statut: a.statut, dateMB: a.dateMBPrevue })))}
    Données Stock: ${JSON.stringify(stock.map(s => ({ nom: s.nom, quantite: s.quantite, alerte: s.alerte })))}
    
    Considère :
    - Gestation : 115 jours (3 mois, 3 semaines, 3 jours).
    - Sevrage : 21 jours optimal (poids min 6-7kg).
    - Biosécurité : Mesures MIRAH contre la PPA.
    - Alimentation : Formules par phase (Starter, Croissance, Finition).
    
    Format de réponse souhaité (JSON):
    {
      "insights": [
        { "title": "...", "desc": "...", "type": "warning" | "info" | "critical" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { insights: [] };
  }
}
