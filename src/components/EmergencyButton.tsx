import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface EmergencyButtonProps {
  onClick: () => void;
  label?: string;
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({ onClick, label = "Urgence" }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 right-4 h-[48px] bg-rose-600 text-white rounded-md font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg z-50"
      style={{ minHeight: '48px' }}
    >
      <AlertTriangle size={20} />
      {label}
    </button>
  );
};

export default EmergencyButton;
