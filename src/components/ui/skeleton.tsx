import type * as React from 'react';

import { cn } from '@/src/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md', className)}
      style={{ background: 'var(--bg-surface-2)' }}
      {...props}
    />
  );
}

export { Skeleton };
