import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/src/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional secondary label (ex. "T01 · Hampshire") */
  hint?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat.',
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          style={{
            width: '100%',
            display: 'inline-flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-pill, 9999px)',
            color: selected ? 'var(--ink)' : 'var(--muted)',
            fontSize: 14,
            fontFamily: 'InstrumentSans, system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown size={14} style={{ marginLeft: 8, color: 'var(--muted)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.value} ${opt.label} ${opt.hint ?? ''}`}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    size={14}
                    style={{
                      marginRight: 8,
                      opacity: value === opt.value ? 1 : 0,
                      color: 'var(--color-accent-500)',
                    }}
                  />
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {opt.hint && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>{opt.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
