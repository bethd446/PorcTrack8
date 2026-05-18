// @vitest-environment jsdom
/**
 * AlertsView — couvre l'acquittement (Sprint E1).
 * Vérifie qu'un click "OK" sur une alerte locale déclenche dismissAlert
 * avec la raison `user_acknowledged` et provoque un recompute.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type {
  Truie, Verrat, BandePorcelets, AlerteServeur, DataSource,
} from '../../types/farm';
import type { FarmAlert } from '../../services/alertEngine';

interface MockFarmValue {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  alerts: FarmAlert[];
  alertesServeur: AlerteServeur[];
  loading: boolean;
  dataSource: DataSource | null;
  refreshData: () => Promise<void>;
  recomputeAlerts: () => Promise<void>;
}

let mockFarmValue: MockFarmValue;
const recomputeAlertsMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../../context/FarmContext', () => ({
  useFarm: () => mockFarmValue,
  useMeta: () => mockFarmValue,
  FarmProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../../context/TroupeauContext', () => ({
  useTroupeau: () => mockFarmValue,
}));
vi.mock('../../context/PilotageContext', () => ({
  usePilotage: () => mockFarmValue,
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../services/alertDismissals', () => ({
  dismissAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/confirmationQueue', () => ({
  getPendingConfirmations: () => Promise.resolve([]),
}));

vi.mock('@ionic/react', () => {
  const Pass: React.FC<{ children?: React.ReactNode }> = ({ children }) => <div>{children}</div>;
  return {
    IonPage: Pass,
    IonContent: Pass,
    IonRefresher: () => null,
    IonRefresherContent: () => null,
    IonToast: () => null,
  };
});

vi.mock('../../components/ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

import AlertsView from './AlertsView';
import { dismissAlert } from '../../services/alertDismissals';
const dismissAlertMock = dismissAlert as unknown as ReturnType<typeof vi.fn>;

function makeAlert(overrides: Partial<FarmAlert> = {}): FarmAlert {
  return {
    id: 'alert-1',
    priority: 'HAUTE',
    category: 'REPRO',
    subjectId: 'T-001',
    subjectLabel: 'Truie 001',
    title: 'Mise-bas imminente',
    message: 'Mise-bas prévue dans 1 jour',
    requiresAction: false,
    actions: [],
    createdAt: new Date('2026-05-01T08:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  dismissAlertMock.mockClear();
  recomputeAlertsMock.mockClear();
  mockFarmValue = {
    truies: [],
    verrats: [],
    bandes: [],
    alerts: [makeAlert()],
    alertesServeur: [],
    loading: false,
    dataSource: 'NETWORK',
    refreshData: vi.fn().mockResolvedValue(undefined),
    recomputeAlerts: recomputeAlertsMock,
  };
});

afterEach(() => cleanup());

describe('AlertsView — acquittement (Sprint E1)', () => {
  it('click "OK ✓" sur une alerte locale → dismissAlert avec raison user_acknowledged', async () => {
    render(
      <MemoryRouter>
        <AlertsView />
      </MemoryRouter>,
    );

    const ackBtn = await screen.findByTestId('alert-card-ack');
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(dismissAlertMock).toHaveBeenCalledTimes(1);
    });
    expect(dismissAlertMock).toHaveBeenCalledWith('user-1', 'alert-1', 'user_acknowledged');
    await waitFor(() => {
      expect(recomputeAlertsMock).toHaveBeenCalled();
    });
  });
});
