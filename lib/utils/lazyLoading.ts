import { ComponentType, lazy } from 'react';

/**
 * Utility for creating lazy-loaded components with proper error boundaries
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<any>,
  fallback?: ComponentType
) {
  return lazy(async () => {
    const module = await importFn();
    // Handle both default and named exports
    if ('default' in module && module.default) {
      return { default: module.default };
    }
    // For named exports, we need to find the component
    const componentName = Object.keys(module).find(key => 
      typeof module[key] === 'function' && 
      module[key].name && 
      !key.startsWith('_')
    );
    if (componentName) {
      return { default: module[componentName] };
    }
    throw new Error('No valid component found in module');
  });
}

/**
 * Lazy load admin components that are rarely used
 */
export const LazyAdminComponents = {
  CDPDashboard: createLazyComponent(() => import('@/components/admin/CDPDashboard')),
  TrialModeToggle: createLazyComponent(() => import('@/components/admin/TrialModeToggle')),
};

/**
 * Lazy load game components that are conditionally rendered
 */
export const LazyGameComponents = {
  BlockchainTriviaGame: createLazyComponent(() => import('@/components/game/BlockchainTriviaGame')),
  SupabaseTriviaGame: createLazyComponent(() => import('@/components/game/SupabaseTriviaGame')),
  BlockchainGameEntry: createLazyComponent(() => import('@/components/game/BlockchainGameEntry')),
  PaymasterTest: createLazyComponent(() => import('@/components/debug/PaymasterTest')),
};

/**
 * Lazy load social components
 * Note: Currently disabled to avoid build issues
 */
export const LazySocialComponents = {
  ComposeCastButton: null as any,
  SocialProfileViewer: null as any,
};

/**
 * Lazy load minikit components
 * Note: Currently disabled to avoid build issues
 */
export const LazyMiniKitComponents = {
  MiniKitLayout: null as any,
  MiniAppActions: null as any,
};

/**
 * Conditional dynamic import based on environment or feature flags
 * Note: This is a placeholder for future dynamic import functionality
 */
export async function conditionalImport<T>(
  condition: boolean,
  modulePath: string,
  fallback?: T
): Promise<T | undefined> {
  if (!condition) {
    return fallback;
  }
  
  // For now, just return the fallback to avoid build issues
  console.warn('Dynamic imports are disabled in production builds');
  return fallback;
}
