import React from 'react';
import { BarChart3, Zap, ShieldCheck } from 'lucide-react';

const FeatureGrid = () => {
  const features = [
    { title: 'Suivi Zootechnique', icon: <Zap /> },
    { title: 'Analyses Prédictives', icon: <BarChart3 /> },
    { title: 'Sécurité Maximale', icon: <ShieldCheck /> },
  ];

  return (
    <section className="py-24 px-20 bg-slate-50">
      <div className="grid grid-cols-3 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white p-9 rounded-[28px] shadow-sm hover:shadow-xl transition-all">
            {f.icon}
            <h3 className="text-xl font-bold mt-4">{f.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureGrid;
