type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

type ErrorHook = (entry: LogEntry) => void;

const RING_SIZE = 50;
const isDev = import.meta.env.DEV;

const ring: LogEntry[] = [];
let errorHook: ErrorHook | null = null;

function push(entry: LogEntry): void {
  if (ring.length >= RING_SIZE) ring.shift();
  ring.push(entry);
}

function emit(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const entry: LogEntry = { level, scope, message, data, timestamp: Date.now() };
  push(entry);

  const prefix = `[${scope}]`;

  if (isDev) {
    const fn = console[level] ?? console.log;
    if (data !== undefined) fn(prefix, message, data);
    else fn(prefix, message);
  } else if (level === 'warn' || level === 'error') {
    if (data !== undefined) console[level](prefix, message, data);
    else console[level](prefix, message);
  }

  if (level === 'error' && errorHook) {
    try {
      errorHook(entry);
    } catch {
      // hook failures must not break the caller
    }
  }
}

export const logger = {
  debug(scope: string, message: string, data?: unknown): void {
    emit('debug', scope, message, data);
  },
  info(scope: string, message: string, data?: unknown): void {
    emit('info', scope, message, data);
  },
  warn(scope: string, message: string, data?: unknown): void {
    emit('warn', scope, message, data);
  },
  error(scope: string, message: string, data?: unknown): void {
    emit('error', scope, message, data);
  },
  getRecent(): ReadonlyArray<LogEntry> {
    return ring.slice();
  },
  setErrorHook(hook: ErrorHook | null): void {
    errorHook = hook;
  },
};

export type { LogEntry, LogLevel };
