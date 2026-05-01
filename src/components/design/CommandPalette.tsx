import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PawPrint,
  Heart,
  Layers,
  LayoutGrid,
  BellRing,
  RotateCcw,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  CheckSquare,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '../ui/command';
import { useTroupeau } from '../../context/TroupeauContext';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CommandPalette — palette Cmd+K (desktop ≥1024px).
 * Wrapper sur cmdk via shadcn `Command`. Fuzzy + keyboard nav natifs.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useTroupeau();

  const go = (path: string): void => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Recherche globale">
      <CommandInput placeholder="Rechercher animal, bande, page, action..." />
      <CommandList>
        <CommandEmpty>Aucun résultat</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go('/today')}>
            <LayoutGrid size={14} />
            Aujourd'hui
          </CommandItem>
          <CommandItem onSelect={() => go('/alerts')}>
            <BellRing size={14} />
            Alertes
          </CommandItem>
          <CommandItem onSelect={() => go('/audit')}>
            <CheckSquare size={14} />
            Audit du jour
          </CommandItem>
          <CommandItem onSelect={() => go('/troupeau')}>
            <PawPrint size={14} />
            Truies & Verrats
          </CommandItem>
          <CommandItem onSelect={() => go('/troupeau/bandes')}>
            <Layers size={14} />
            Bandes
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/maternite')}>
            <RotateCcw size={14} />
            Cycles · Maternité
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/post-sevrage')}>
            <RotateCcw size={14} />
            Cycles · Post-sevrage
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/croissance')}>
            <RotateCcw size={14} />
            Cycles · Croissance
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/engraissement')}>
            <RotateCcw size={14} />
            Cycles · Engraissement
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/finition')}>
            <RotateCcw size={14} />
            Cycles · Finition
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/repro')}>
            <RotateCcw size={14} />
            Cycles · Reproduction
          </CommandItem>
          <CommandItem onSelect={() => go('/cycles/sortie')}>
            <RotateCcw size={14} />
            Cycles · Sortie
          </CommandItem>
          <CommandItem onSelect={() => go('/pilotage/perf')}>
            <BarChart3 size={14} />
            Pilotage · KPIs
          </CommandItem>
          <CommandItem onSelect={() => go('/pilotage/finances')}>
            <BarChart3 size={14} />
            Pilotage · Finances
          </CommandItem>
          <CommandItem onSelect={() => go('/pilotage/finances/rapport')}>
            <BarChart3 size={14} />
            Pilotage · Rapports
          </CommandItem>
          <CommandItem onSelect={() => go('/pilotage/previsions')}>
            <BarChart3 size={14} />
            Pilotage · Prévisions
          </CommandItem>
          <CommandItem onSelect={() => go('/ressources/aliments')}>
            <Package size={14} />
            Ressources · Aliments
          </CommandItem>
          <CommandItem onSelect={() => go('/ressources/pharmacie')}>
            <Package size={14} />
            Ressources · Pharmacie
          </CommandItem>
          <CommandItem onSelect={() => go('/more')}>
            <Settings size={14} />
            Réglages
          </CommandItem>
          <CommandItem onSelect={() => go('/aide')}>
            <HelpCircle size={14} />
            Aide
          </CommandItem>
        </CommandGroup>

        {truies.length > 0 ? (
          <CommandGroup heading="Animaux · Truies">
            {truies.slice(0, 50).map((t) => (
              <CommandItem
                key={`truie-${t.id}`}
                value={`truie ${t.displayId} ${t.nom ?? ''} ${t.boucle}`}
                onSelect={() => go(`/troupeau/truies/${t.id}`)}
              >
                <PawPrint size={14} />
                <span>{t.nom ? `${t.nom} (${t.displayId})` : `Truie ${t.displayId}`}</span>
                {t.boucle ? <CommandShortcut>{t.boucle}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {verrats.length > 0 ? (
          <CommandGroup heading="Animaux · Verrats">
            {verrats.slice(0, 30).map((v) => (
              <CommandItem
                key={`verrat-${v.id}`}
                value={`verrat ${v.displayId} ${v.nom ?? ''} ${v.boucle}`}
                onSelect={() => go(`/troupeau/verrats/${v.id}`)}
              >
                <Heart size={14} />
                <span>{v.nom ? `${v.nom} (${v.displayId})` : `Verrat ${v.displayId}`}</span>
                {v.boucle ? <CommandShortcut>{v.boucle}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {bandes.length > 0 ? (
          <CommandGroup heading="Bandes">
            {bandes.slice(0, 30).map((b) => (
              <CommandItem
                key={`bande-${b.id}`}
                value={`bande ${b.idPortee || b.id} ${b.statut}`}
                onSelect={() => go(`/troupeau/bandes/${b.id}`)}
              >
                <Layers size={14} />
                <span>Bande {b.idPortee || b.id.slice(0, 8)}</span>
                {b.statut ? <CommandShortcut>{b.statut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Actions">
          {['Saillie', 'Mise-bas', 'Pesée', 'Mortalité', 'Note'].map((a) => (
            <CommandItem key={`action-${a}`} onSelect={() => go('/audit')}>
              <Plus size={14} />
              {a}
              <CommandShortcut>Action rapide</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
