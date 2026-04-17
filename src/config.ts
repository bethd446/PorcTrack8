// Global Configuration for PorcTrack V5 PRO
export const DEBUG = localStorage.getItem('porcTrack_debug') === '1';

export const APP_VERSION = '5.0.0-PRO';

export const isDebugEnabled = () => {
    return localStorage.getItem('porcTrack_debug') === '1';
};

export const setDebugEnabled = (enabled: boolean) => {
    localStorage.setItem('porcTrack_debug', enabled ? '1' : '0');
};
