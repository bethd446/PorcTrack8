import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FARM_CONFIG } from '../../config/farm';
import KpiCardV6 from '../design/KpiCard';
import TopBarSync from '../design/TopBarSync';
import Eyebrow from '../design/Eyebrow';
import PanelAlertes, { type PanelAlerteRow } from './PanelAlertes';
import PanelBandesPerf, { type PanelBandeRow } from './PanelBandesPerf';
import PanelCalendrier, { type AgendaItem } from './PanelCalendrier';

interface DesktopKpis {
  cheptelActif: number;
  cheptelSpark: number[];
  saillies: number;
  sailliesSpark: number[];
  bandesActives: number;
  bandesSpark: number[];
  alertesHaute: number;
  alertesSpark: number[];
}

interface CockpitDesktopProps {
  userFirstName: string;
  todayShort: string;
  headerDate: string;
  headerTime: string;
  truiesCount: number;
  verratsCount: number;
  nbPorcelets: number;
  desktopKpis: DesktopKpis;
  topBandesNv: PanelBandeRow[];
  topAlerts: PanelAlerteRow[];
  calendarVisible: AgendaItem[];
  targetNv: number;
  pulse: boolean;
}

const CockpitDesktop: React.FC<CockpitDesktopProps> = ({
  userFirstName,
  todayShort,
  headerDate,
  headerTime,
  truiesCount,
  verratsCount,
  nbPorcelets,
  desktopKpis,
  topBandesNv,
  topAlerts,
  calendarVisible,
  targetNv,
  pulse,
}) => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBarSync
          crumbs={['Pilotage', 'Cockpit']}
          onMariusClick={() => {
            const evt = new CustomEvent('open-chatbot');
            window.dispatchEvent(evt);
          }}
        />

        <div
          style={{
            flex: 1,
            background: 'var(--bg-app, var(--bg-surface-2))',
            padding: '24px 28px 28px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Eyebrow dotColor="accent">
              Aujourd&rsquo;hui · {todayShort}
            </Eyebrow>
            <h1
              className="ft-heading"
              style={{
                fontFamily: 'BigShoulders, system-ui, sans-serif',
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                margin: '8px 0 4px',
              }}
            >
              Bonjour, {userFirstName}
            </h1>
            <div
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 11,
                letterSpacing: '0.06em',
                color: 'var(--muted)',
                textTransform: 'uppercase',
              }}
            >
              {headerDate} · {headerTime} · {FARM_CONFIG.FARM_NAME}
            </div>
          </div>

          <section
            aria-label="Indicateurs clés"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <KpiCardV6
              label="Cheptel actif"
              value={desktopKpis.cheptelActif}
              trend={
                desktopKpis.cheptelActif > 0
                  ? `${truiesCount} truies · ${verratsCount} verrats`
                  : 'Aucune donnée'
              }
              spark={desktopKpis.cheptelSpark}
              variant="accent"
              onClick={() => navigate('/troupeau')}
            />
            <KpiCardV6
              label="Saillies 7 jours"
              value={desktopKpis.saillies}
              trend={
                desktopKpis.saillies > 0
                  ? 'Cycle en cours'
                  : 'Aucune saillie récente'
              }
              spark={desktopKpis.sailliesSpark}
              onClick={() => navigate('/cycles/repro')}
            />
            <KpiCardV6
              label="Bandes actives"
              value={desktopKpis.bandesActives}
              trend={`${nbPorcelets} porcelets`}
              spark={desktopKpis.bandesSpark}
              onClick={() => navigate('/troupeau/bandes')}
            />
            <KpiCardV6
              label="Alertes prioritaires"
              value={desktopKpis.alertesHaute}
              trend={
                desktopKpis.alertesHaute > 0
                  ? 'À traiter aujourd’hui'
                  : 'Tout est sous contrôle'
              }
              trendDir={desktopKpis.alertesHaute > 0 ? 'down' : 'up'}
              spark={desktopKpis.alertesSpark}
              onClick={() => navigate('/alerts')}
              className={pulse ? 'animate-pulse' : ''}
            />
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <PanelBandesPerf bandes={topBandesNv} target={targetNv} />
            <PanelAlertes
              alerts={topAlerts}
              onSeeAll={() => navigate('/alerts')}
            />
          </div>

          <PanelCalendrier
            items={calendarVisible}
            onSeeAll={() => navigate('/cycles/repro')}
          />
        </div>
      </main>
    </div>
  );
};

export default CockpitDesktop;
