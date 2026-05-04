import { kvGet, kvSet } from './services/kvStore';

// Global Configuration for PorcTrack V5 PRO
export const DEBUG = false; // Default to false, use isDebugEnabled() for dynamic check

export const APP_VERSION = 'v2.1.0';

export const isDebugEnabled = () => {
    return kvGet('porcTrack_debug') === '1';
};

export const setDebugEnabled = (enabled: boolean) => {
    void kvSet('porcTrack_debug', enabled ? '1' : '0');
};
