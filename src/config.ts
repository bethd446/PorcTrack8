import { kvGet, kvSet } from './services/kvStore';

// Global Configuration for PorcTrack V5 PRO
export const DEBUG = false; // Default to false, use isDebugEnabled() for dynamic check

export const APP_VERSION = '5.0.0-PRO';

export const isDebugEnabled = () => {
    return kvGet('porcTrack_debug') === '1';
};

export const setDebugEnabled = (enabled: boolean) => {
    void kvSet('porcTrack_debug', enabled ? '1' : '0');
};
