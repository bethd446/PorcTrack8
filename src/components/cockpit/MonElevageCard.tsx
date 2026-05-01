import React from 'react';
import { Users, Heart, Baby, Home } from 'lucide-react';
import { SectionDivider, HubTile } from '../agritech';
import { FARM_CONFIG } from '../../config/farm';

interface MonElevageCardProps {
  nbTruies: number;
  nbVerrats: number;
  nbPorcelets: number;
  nbPorceletsSousMere: number;
  postSevrageTotal: number;
}

const MonElevageCard: React.FC<MonElevageCardProps> = ({
  nbTruies,
  nbVerrats,
  nbPorcelets,
  nbPorceletsSousMere,
  postSevrageTotal,
}) => {
  return (
    <section role="region" aria-label="Mon élevage">
      <SectionDivider label="Mon élevage" />
      <div className="grid grid-cols-2 gap-2.5">
        <HubTile
          icon={<Users size={20} aria-hidden="true" />}
          title="Truies"
          subtitle="Reproductrices"
          count={nbTruies}
          tone="accent"
          to="/troupeau"
          variant="compact"
        />
        <HubTile
          icon={<Heart size={20} aria-hidden="true" />}
          title="Verrats"
          subtitle="Reproducteurs"
          count={nbVerrats}
          tone="coral"
          to="/troupeau/verrats"
          variant="compact"
        />
        <HubTile
          icon={<Baby size={20} aria-hidden="true" />}
          title="Porcelets"
          subtitle={`${nbPorceletsSousMere} s/m · ${postSevrageTotal} sev.`}
          count={nbPorcelets}
          tone="gold"
          to="/troupeau/bandes"
          variant="compact"
        />
        <HubTile
          icon={<Home size={20} aria-hidden="true" />}
          title="Loges"
          subtitle={`${FARM_CONFIG.MATERNITE_LOGES_CAPACITY} mat · ${FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} sev · ${FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} engr`}
          count={
            FARM_CONFIG.MATERNITE_LOGES_CAPACITY +
            FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY +
            FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY
          }
          tone="teal"
          to="/troupeau"
          variant="compact"
        />
      </div>
    </section>
  );
};

export default MonElevageCard;
