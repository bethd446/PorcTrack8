import type * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--bg-surface)',
          '--normal-text': 'var(--ink)',
          '--normal-border': 'var(--line)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
