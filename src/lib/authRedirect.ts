const PROD_DOMAIN = 'https://porctrack.tech';

export function getAuthRedirectURL(path = '/auth/callback'): string {
  if (import.meta.env.PROD) return `${PROD_DOMAIN}${path}`;
  if (typeof window === 'undefined') return `${PROD_DOMAIN}${path}`;
  return `${window.location.origin}${path}`;
}
