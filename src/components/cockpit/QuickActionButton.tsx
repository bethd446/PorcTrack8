import React from 'react';
import { Plus } from 'lucide-react';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabledHint?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabledHint,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-dense pressable flex flex-col items-center gap-2 !py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      aria-label={label}
    >
      <span
        className={
          'inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 ' +
          (disabledHint ? 'text-text-2' : 'text-accent')
        }
      >
        {disabledHint ? <Plus size={14} aria-hidden="true" /> : icon}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-text-1">
        {label}
      </span>
      {disabledHint ? (
        <span className="font-mono text-[10px] text-text-2">Bientôt</span>
      ) : null}
    </button>
  );
};

export default QuickActionButton;
