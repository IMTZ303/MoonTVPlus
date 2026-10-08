/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { normalizeApiBaseUrl } from '@/lib/url';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = 'upstash';


  try {
    const body = await request.json();

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;



    const { SiteName, Announcement, AnnouncementDisplayMode, SearchDownstreamMaxPage, SiteInterfaceCacheTime, DoubanProxyType, DoubanProxy, DoubanImageProxyType, DoubanImageProxy, DisableYellowFilter, FluidSearch, TMDBApiKey, TMDBProxy, TMDBReverseProxy, TMDBImageBaseUrl, BannerDataSource, RecommendationDataSource, CustomAdFilterCode, CustomAdFilterVersion, LoginRequireTurnstile, TurnstileSiteKey, TurnstileSecretKey, DefaultUserTags } = body;
    if (!SiteName || !Number.isFinite(Number(SearchDownstreamMaxPage)) || Number(SearchDownstreamMaxPage) < 1 || !Number.isFinite(Number(SiteInterfaceCacheTime)) || Number(SiteInterfaceCacheTime) < 0) return NextResponse.json({ error: '站点名称、搜索页数或缓存时间无效' }, { status: 400 });

    // 参数校验


    const adminConfig = await getConfig();

    // 权限校验 - 使用v2用户系统
    if (username !== process.env.USERNAME) {
      const userInfo = await db.getUserInfoV2(username);
      if (!userInfo || userInfo.role !== 'admin' || userInfo.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    // 更新缓存中的站点设置
    // API Base URL 统一去尾斜杠，避免运行时拼接路径出现 //
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      AnnouncementDisplayMode,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanProxyType,
      DoubanProxy: normalizeApiBaseUrl(DoubanProxy),
      DoubanImageProxyType,
      DoubanImageProxy: normalizeApiBaseUrl(DoubanImageProxy),
      DisableYellowFilter,
      FluidSearch,




      TMDBApiKey,
      TMDBProxy: normalizeApiBaseUrl(TMDBProxy),
      TMDBReverseProxy: normalizeApiBaseUrl(TMDBReverseProxy),
      TMDBImageBaseUrl: normalizeApiBaseUrl(TMDBImageBaseUrl),





      BannerDataSource,
      RecommendationDataSource,
      CustomAdFilterCode,
      CustomAdFilterVersion,




      LoginRequireTurnstile,
      TurnstileSiteKey,
      TurnstileSecretKey,
      DefaultUserTags,















    };

    // 写入数据库
    await db.saveAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store', // 不缓存结果
        },
      }
    );
  } catch (error) {
    console.error('更新站点配置失败:', error);
    return NextResponse.json(
      {
        error: '更新站点配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
