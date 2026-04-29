import React, { useState } from 'react';

export function WebhookPanel() {
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');

  const saveConfig = () => {
    // Dans un vrai scénario, on persiste ça dans Supabase
    alert('Configuration enregistrée (Simulation)');
  };

  return (
    <div className="premium-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="ft-heading text-sm text-[#064e3b] uppercase tracking-wide">Config Webhook Telegram</h2>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Bot Token</label>
          <input 
            type="password" 
            value={token} 
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-gray-50 rounded-lg p-2 text-sm border-none"
            placeholder="7234...:AAF..." 
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Chat ID</label>
          <input 
            type="text" 
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-full bg-gray-50 rounded-lg p-2 text-sm border-none"
            placeholder="-100..." 
          />
        </div>
        <button 
          onClick={saveConfig}
          className="w-full bg-[#064e3b] text-white text-sm py-2 rounded-lg font-medium hover:bg-emerald-900 transition-colors"
        >
          Enregistrer les Webhooks
        </button>
      </div>
    </div>
  );
}
