const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'ChunkLoadError',
  'Loading chunk',
  'Loading CSS chunk',
];

export function isChunkError(error?: Error | null): boolean {
  if (!error) return false;
  const msg = error.message ?? '';
  const name = error.name ?? '';
  return (
    name === 'ChunkLoadError' ||
    CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p))
  );
}

export function reloadForChunkError(): void {
  try {
    sessionStorage.removeItem('pt:chunk-error-reloaded');
  } catch {
    // sessionStorage indisponible (mode privé strict) — on continue.
  }
  window.location.reload();
}
