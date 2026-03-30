/**
 * Production-safe logger utility
 * Only logs in development or when explicitly enabled
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.ENABLE_DEBUG_LOGS === 'true';

class Logger {
  private shouldLog(): boolean {
    return isDevelopment || isDebugEnabled;
  }

  log(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.info(...args);
    }
  }

  warn(...args: unknown[]): void {
    // Always log warnings in production
    console.warn(...args);
  }

  error(...args: unknown[]): void {
    // Always log errors in production
    console.error(...args);
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.debug(...args);
    }
  }

  // Production-safe method to log sensitive data (only in dev)
  sensitive(label: string, data: unknown): void {
    if (isDevelopment) {
      console.log(`[SENSITIVE] ${label}:`, data);
    }
  }

  // Log with timestamp
  time(label: string, ...args: unknown[]): void {
    if (this.shouldLog()) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${label}:`, ...args);
    }
  }
}

export const logger = new Logger();

// Helper for API routes
export const apiLogger = {
  request: (method: string, path: string, details?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.log(`🔵 ${method} ${path}`, details || '');
    }
  },
  
  success: (method: string, path: string, details?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.log(`✅ ${method} ${path}`, details || '');
    }
  },
  
  error: (method: string, path: string, error: unknown) => {
    // Always log errors
    console.error(`❌ ${method} ${path}`, error instanceof Error ? error.message : error);
  },
  
  warn: (method: string, path: string, message: string) => {
    console.warn(`⚠️ ${method} ${path}:`, message);
  }
};

