import { initRecommendationCacheModule } from '@/lib/recommendations/cache';
let initialized = false;
export function initStartupCacheCleanup(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  initRecommendationCacheModule();
}
