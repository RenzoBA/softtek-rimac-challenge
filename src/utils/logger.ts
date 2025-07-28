export const logger = {
  info: (message: string, meta?: any) =>
    console.info(`[INFO] ${message}`, meta || ""),
  warn: (message: string, meta?: any) =>
    console.warn(`[WARN] ${message}`, meta || ""),
  error: (message: string, meta?: any) =>
    console.error(`[ERROR] ${message}`, meta || ""),
};
