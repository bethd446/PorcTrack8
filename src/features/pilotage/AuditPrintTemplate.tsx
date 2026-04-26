import React from 'react';
import type { AuditSnapshot } from '../../services/exportService';

interface AuditPrintTemplateProps {
  data: AuditSnapshot;
}

/**
 * AuditPrintTemplate — Template A4 épuré pour impression / PDF
 * Ce composant est normalement masqué et n'apparait que via window.print()
 */
const AuditPrintTemplate: React.FC<AuditPrintTemplateProps> = ({ data }) => {
  return (
    <div className="hidden print:block p-10 bg-white text-black font-serif leading-normal min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{data.farmName}</h1>
          <p className="text-sm italic">Système PorcTrack 8 — Rapport d'Audit de Performance</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{data.date}</p>
          <p className="text-[10px] uppercase">Document Confidentiel / Propriétaire</p>
        </div>
      </div>

      {/* SYNTHÈSE FINANCIÈRE */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold uppercase mb-4 border-l-4 border-black pl-3 bg-gray-100 py-1">
          1. Santé Financière (Cheptel Actif)
        </h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="border border-black p-4">
            <p className="text-[10px] uppercase font-bold text-gray-600">Marge Nette Projetée</p>
            <p className="text-2xl font-black">{formatFCFA(data.finance.margeGlobale)} FCFA</p>
          </div>
          <div className="border border-black p-4">
            <p className="text-[10px] uppercase font-bold text-gray-600">Valeur Totale du Cheptel</p>
            <p className="text-2xl font-black">{formatFCFA(data.finance.revenuProjete)} FCFA</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-8 text-sm">
          <p>Dette Alimentaire Engagée : <strong>{formatFCFA(data.finance.detteAlimentaire)} FCFA</strong></p>
          <p>Frais Fixes & Sanitaires : <strong>{formatFCFA(data.finance.coutsFixes)} FCFA</strong></p>
        </div>
      </section>

      {/* INVENTAIRE BIOLOGIQUE */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold uppercase mb-4 border-l-4 border-black pl-3 bg-gray-100 py-1">
          2. Inventaire Technique
        </h2>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 text-left">Phase de Production</th>
              <th className="border border-black p-2 text-center">Effectif (Bandes)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">Maternité (Sous-mère)</td>
              <td className="border border-black p-2 text-center">{data.inventory.maternite}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Post-Sevrage</td>
              <td className="border border-black p-2 text-center">{data.inventory.postSevrage}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Croissance</td>
              <td className="border border-black p-2 text-center">{data.inventory.croissance}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Engraissement & Finition</td>
              <td className="border border-black p-2 text-center">{data.inventory.engraissement + data.inventory.finition}</td>
            </tr>
            <tr className="font-bold">
              <td className="border border-black p-2 bg-gray-50">Total Porcelets Vivants</td>
              <td className="border border-black p-2 text-center bg-gray-50">{data.inventory.totalPorcelets}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* URGENCES & VIGIE */}
      <section className="mb-10 break-inside-avoid">
        <h2 className="text-xl font-bold uppercase mb-4 border-l-4 border-black pl-3 bg-gray-100 py-1">
          3. Urgences & Recommandations
        </h2>
        {data.urgences.length === 0 ? (
          <p className="text-sm italic">Aucune alerte critique enregistrée. Exploitation sous contrôle.</p>
        ) : (
          <ul className="space-y-4">
            {data.urgences.map((alert, i) => (
              <li key={i} className="border-l-2 border-black pl-4">
                <p className="text-sm font-bold uppercase">{alert.category} — {alert.title}</p>
                <p className="text-xs text-gray-700">{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PALMARÈS */}
      <section className="break-inside-avoid">
        <h2 className="text-xl font-bold uppercase mb-4 border-l-4 border-black pl-3 bg-gray-100 py-1">
          4. Performance par Lot
        </h2>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-bold text-emerald-700">✓ Top Performer</p>
            <p>Bande : {data.topBande || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold text-red-700">⚠ Attention Requise</p>
            <p>Bande : {data.flopBande || 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* FOOTER PRINT */}
      <div className="fixed bottom-10 left-10 right-10 border-t border-gray-300 pt-2 text-[8px] text-gray-500 flex justify-between uppercase">
        <span>Généré par PorcTrack 8 Intelligence</span>
        <span>Signature Directeur : ___________________________</span>
      </div>
    </div>
  );
};

function formatFCFA(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
}

export default AuditPrintTemplate;
