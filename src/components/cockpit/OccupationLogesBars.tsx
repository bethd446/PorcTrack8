import React from 'react';
import { SectionDivider } from '../agritech';
import { FARM_CONFIG } from '../../config/farm';
import LogeBar from './LogeBar';

interface LogeOcc {
  occupees: number;
  capacite: number;
  alerte: 'OK' | 'HIGH' | 'FULL';
}

interface OccupationLogesBarsProps {
  materniteOcc: LogeOcc;
  postSevrageOcc: LogeOcc;
  engraissementOcc: LogeOcc;
}

const OccupationLogesBars: React.FC<OccupationLogesBarsProps> = ({
  materniteOcc,
  postSevrageOcc,
  engraissementOcc,
}) => {
  return (
    <section aria-label="Occupation loges" role="region">
      <SectionDivider label="Occupation loges" />
      <div className="card-dense flex flex-col gap-3.5">
        <LogeBar
          label={`Maternité · ${FARM_CONFIG.MATERNITE_LOGES_CAPACITY} loges`}
          occupees={materniteOcc.occupees}
          capacite={materniteOcc.capacite}
          alerte={materniteOcc.alerte}
        />
        <div>
          <LogeBar
            label={`Post-sevrage · ${FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} loges`}
            occupees={postSevrageOcc.occupees}
            capacite={postSevrageOcc.capacite}
            alerte={postSevrageOcc.alerte}
          />
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map((loge) => (
              <div
                key={loge.id}
                className="rounded-lg bg-bg-2 p-2.5 flex flex-col items-center gap-1"
              >
                <span className="kpi-label text-[11px]">{loge.id}</span>
                <span className="ft-code text-[14px] font-semibold text-accent">
                  {loge.porcelets}
                </span>
              </div>
            ))}
          </div>
        </div>
        <LogeBar
          label={`Croissance-finition · ${FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} loges`}
          occupees={engraissementOcc.occupees}
          capacite={engraissementOcc.capacite}
          alerte={engraissementOcc.alerte}
        />
      </div>
    </section>
  );
};

export default OccupationLogesBars;
