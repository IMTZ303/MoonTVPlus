import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

import './globals.css';

import { parseAuthInfo } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getUserFeatureAccess } from '@/lib/permissions';

import { GlobalErrorIndicator } from '@/components/GlobalErrorIndicator';
import RouteScrollReset from '@/components/RouteScrollReset';
import { SiteProvider } from '@/components/SiteProvider';
import { StartupCacheCleanup } from '@/components/StartupCacheCleanup';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TokenRefreshManager } from '@/components/TokenRefreshManager';
import TopProgressBar from '@/components/TopProgressBar';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return { title: config.SiteConfig.SiteName, description: '影视聚合', other: { 'moontvplus-site': '1' } };
}
export const viewport: Viewport = { viewportFit: 'cover' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();
  const site = config.SiteConfig;
  const cookieStore = cookies();
  const auth = parseAuthInfo(cookieStore.get('auth')?.value);
  const access = await getUserFeatureAccess(auth?.username);
  const runtimeConfig = {
    STORAGE_TYPE: 'upstash', DISPLAY_STORAGE_TYPE: 'upstash',
    DOUBAN_PROXY_TYPE: site.DoubanProxyType, DOUBAN_PROXY: site.DoubanProxy,
    DOUBAN_IMAGE_PROXY_TYPE: site.DoubanImageProxyType, DOUBAN_IMAGE_PROXY: site.DoubanImageProxy,
    DISABLE_YELLOW_FILTER: site.DisableYellowFilter,
    CUSTOM_CATEGORIES: config.CustomCategories.filter(c => !c.disabled).map(c => ({ name: c.name || '', type: c.type, query: c.query })),
    FLUID_SEARCH: site.FluidSearch, RecommendationDataSource: site.RecommendationDataSource || 'Mixed',
    TMDB_IMAGE_BASE_URL: site.TMDBImageBaseUrl || 'https://image.tmdb.org',
    ENABLE_TVBOX_SUBSCRIBE: process.env.ENABLE_TVBOX_SUBSCRIBE === 'true',
    LOGIN_REQUIRE_TURNSTILE: site.LoginRequireTurnstile || false,
    TURNSTILE_SITE_KEY: site.TurnstileSiteKey || '',
    LIVE_ENABLED: process.env.LIVE_ENABLED !== 'false' && access.live,
    CUSTOM_AD_FILTER_VERSION: site.CustomAdFilterVersion || 0,
  };
  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta name='moontvplus-site' content='1' />
        <script dangerouslySetInnerHTML={{ __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig).replace(/</g, String.fromCharCode(92) + 'u003c')};` }} />
      </head>
      <body className='min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200'>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
          <TopProgressBar /><RouteScrollReset /><TokenRefreshManager /><StartupCacheCleanup />
          <SiteProvider siteName={site.SiteName} announcement={site.Announcement} announcementDisplayMode={site.AnnouncementDisplayMode || 'once'} tmdbApiKey={site.TMDBApiKey}>
            <GlobalErrorIndicator />{children}
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
