import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { CURRENT_VERSION } from '@/lib/version';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const config = await getConfig();
  return NextResponse.json({
    SiteName: config.SiteConfig.SiteName,
    StorageType: 'upstash',
    Version: CURRENT_VERSION,
    LoginRequireTurnstile: config.SiteConfig.LoginRequireTurnstile || false,
    TurnstileSiteKey: config.SiteConfig.TurnstileSiteKey || '',
  });
}
