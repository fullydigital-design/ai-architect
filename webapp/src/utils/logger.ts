// Thin facade over console. Drops debug/info in production builds; warn/error always pass through.
// Future: pluggable backend (Electron IPC, file, Sentry) — for now, console only.

const isDev = import.meta.env.DEV;

type LogArgs = Parameters<typeof console.log>;

export const logger = {
  debug: (...args: LogArgs) => { if (isDev) console.debug(...args); },
  info:  (...args: LogArgs) => { if (isDev) console.info(...args); },
  log:   (...args: LogArgs) => { if (isDev) console.log(...args); },
  warn:  (...args: LogArgs) => { console.warn(...args); },
  error: (...args: LogArgs) => { console.error(...args); },
};
