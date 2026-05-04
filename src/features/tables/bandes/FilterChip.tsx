import React from 'react';
import { Button } from '@/design-system';

interface FilterChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ active, label, onClick }) => (
  <Button
    variant={active ? 'primary' : 'secondary'}
    size="small"
    onClick={onClick}
    aria-pressed={active}
  >
    {label}
  </Button>
);

export default FilterChip;
