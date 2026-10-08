'use client';
import { useEffect } from 'react';
import { initStartupCacheCleanup } from '@/lib/startup/cacheCleanup';
export function StartupCacheCleanup() {
  useEffect(() => {
    initStartupCacheCleanup();
    // Remove old MoonTV PWA workers so an upgraded deployment loads fresh routes.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.filter((registration) =>
          /\/(?:sw|push-sw)\.js(?:\?|$)/.test((registration.active || registration.waiting || registration.installing)?.scriptURL || '')
        ).map((registration) => registration.unregister()))
      ).catch(console.error);
    }
  }, []);
  return null;
}
