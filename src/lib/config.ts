/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

import { db } from '@/lib/db';
import { normalizeApiBaseUrl } from '@/lib/url';

import { AdminConfig } from './admin.types';
import { setServerTmdbImageBaseUrl } from './tmdb-image-base';


const DEFAULT_LIVE_REFRESH_INTERVAL_HOURS = 12;
const DEFAULT_TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org';

function normalizeLiveRefreshIntervalHours(
  refreshIntervalHours?: number
): number {
  const normalizedInterval = Number(refreshIntervalHours);

  if (!Number.isFinite(normalizedInterval) || normalizedInterval <= 0) {
    return DEFAULT_LIVE_REFRESH_INTERVAL_HOURS;
  }

  return Math.floor(normalizedInterval);
}

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
  proxyMode?: boolean;
}

export interface LiveCfg {
  name: string;
  url: string;
  ua?: string;
  epg?: string; // 节目单
}

interface ConfigFileStruct {
  cache_time?: number;
  api_site?: {
    [key: string]: ApiSite;
  };
  custom_category?: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
  }[];
  lives?: {
    [key: string]: LiveCfg;
  };
  special_source_apis?: string[];

}

export const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=',
    pagePath: '?ac=videolist&wd={query}&pg={page}',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
};

// 在模块加载时根据环境决定配置来源
let cachedConfig: AdminConfig;
let configInitPromise: Promise<AdminConfig> | null = null;

// 从配置文件补充管理员配置
export function refineConfig(adminConfig: AdminConfig): AdminConfig {
  let fileConfig: ConfigFileStruct;
  try {
    fileConfig = JSON.parse(adminConfig.ConfigFile) as ConfigFileStruct;
  } catch (e) {
    fileConfig = {} as ConfigFileStruct;
  }

  // 合并文件中的源信息
  const apiSitesFromFile = Object.entries(fileConfig.api_site || []);
  const currentApiSites = new Map(
    (adminConfig.SourceConfig || []).map((s) => [s.key, s])
  );

  apiSitesFromFile.forEach(([key, site]) => {
    const existingSource = currentApiSites.get(key);
    if (existingSource) {
      // 如果已存在，只覆盖 name、api、detail 和 from
      existingSource.name = site.name;
      existingSource.api = site.api;
      existingSource.detail = site.detail;
      existingSource.from = 'config';
    } else {
      // 如果不存在，创建新条目
      currentApiSites.set(key, {
        key,
        name: site.name,
        api: site.api,
        detail: site.detail,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有源是否在 fileConfig.api_site 中，如果不在则标记为 custom
  const apiSitesFromFileKey = new Set(apiSitesFromFile.map(([key]) => key));
  currentApiSites.forEach((source) => {
    if (!apiSitesFromFileKey.has(source.key)) {
      source.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.SourceConfig = Array.from(currentApiSites.values());

  const specialApisFromFile = Array.isArray(fileConfig.special_source_apis)
    ? fileConfig.special_source_apis
    : undefined;
  if (specialApisFromFile) {
    const sourceKeys = new Set(adminConfig.SourceConfig.map((source) => source.key));

  }

  // 覆盖 CustomCategories
  const customCategoriesFromFile = fileConfig.custom_category || [];
  const currentCustomCategories = new Map(
    (adminConfig.CustomCategories || []).map((c) => [c.query + c.type, c])
  );

  customCategoriesFromFile.forEach((category) => {
    const key = category.query + category.type;
    const existedCategory = currentCustomCategories.get(key);
    if (existedCategory) {
      existedCategory.name = category.name;
      existedCategory.query = category.query;
      existedCategory.type = category.type;
      existedCategory.from = 'config';
    } else {
      currentCustomCategories.set(key, {
        name: category.name,
        type: category.type,
        query: category.query,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 CustomCategories 是否在 fileConfig.custom_category 中，如果不在则标记为 custom
  const customCategoriesFromFileKeys = new Set(
    customCategoriesFromFile.map((c) => c.query + c.type)
  );
  currentCustomCategories.forEach((category) => {
    if (!customCategoriesFromFileKeys.has(category.query + category.type)) {
      category.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.CustomCategories = Array.from(currentCustomCategories.values());

  const livesFromFile = Object.entries(fileConfig.lives || []);
  const currentLives = new Map(
    (adminConfig.LiveConfig || []).map((l) => [l.key, l])
  );
  livesFromFile.forEach(([key, site]) => {
    const existingLive = currentLives.get(key);
    if (existingLive) {
      existingLive.name = site.name;
      existingLive.url = site.url;
      existingLive.ua = site.ua;
      existingLive.epg = site.epg;
    } else {
      // 如果不存在，创建新条目
      currentLives.set(key, {
        key,
        name: site.name,
        url: site.url,
        ua: site.ua,
        epg: site.epg,
        channelNumber: 0,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有 LiveConfig 是否在 fileConfig.lives 中，如果不在则标记为 custom
  const livesFromFileKeys = new Set(livesFromFile.map(([key]) => key));
  currentLives.forEach((live) => {
    if (!livesFromFileKeys.has(live.key)) {
      live.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.LiveConfig = Array.from(currentLives.values());

  return adminConfig;
}

async function getInitConfig(
  configFile: string,
  subConfig: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  } = {
    URL: '',
    AutoUpdate: false,
    LastCheck: '',
  }
): Promise<AdminConfig> {
  let cfgFile: ConfigFileStruct;

  // 优先从环境变量读取订阅 URL
  const envSubUrl = process.env.CONFIG_SUBSCRIPTION_URL || '';

  if (envSubUrl) {
    try {
      const response = await fetch(envSubUrl);
      if (response.ok) {
        const configContent = await response.text();
        const bs58 = (await import('bs58')).default;
        const decodedBytes = bs58.decode(configContent);
        const decodedContent = new TextDecoder().decode(decodedBytes);
        configFile = decodedContent;
        console.log('已从订阅 URL 获取配置');
      }
    } catch (e) {
      console.error('从订阅 URL 获取配置失败:', e);
    }
  }

  // 优先从环境变量读取配置
  const envConfig = process.env.INIT_CONFIG || '';
  const configSource = envConfig || configFile;

  try {
    cfgFile = JSON.parse(configSource) as ConfigFileStruct;
  } catch (e) {
    cfgFile = {} as ConfigFileStruct;
  }

  const adminConfig: AdminConfig = {
    ConfigFile: configSource,
    ConfigSubscribtion: subConfig,
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      AnnouncementDisplayMode:
        process.env.ANNOUNCEMENT_DISPLAY_MODE === 'every'
          ? 'every'
          : 'once',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: cfgFile.cache_time || 7200,
      DoubanProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_PROXY_TYPE || 'cmliussss-cdn-tencent',
      DoubanProxy: process.env.NEXT_PUBLIC_DOUBAN_PROXY || '',
      DoubanImageProxyType:
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-tencent',
      DoubanImageProxy: process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY || '',
      DisableYellowFilter:
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
      // 弹幕配置




      // TMDB配置
      TMDBApiKey: process.env.TMDB_API_KEY || '',
      TMDBProxy: process.env.TMDB_PROXY || '',
      TMDBReverseProxy: process.env.TMDB_REVERSE_PROXY || '',
      TMDBImageBaseUrl:
        process.env.TMDB_IMAGE_BASE_URL || DEFAULT_TMDB_IMAGE_BASE_URL,
      // 动漫/Bangumi配置





      // 本地设置云同步模式（全局）：off=关闭 manual=手动 auto=自动

      // Pansou配置




      // 磁链配置





      // 评论功能开关





      LoginRequireTurnstile: false,
      TurnstileSiteKey: '',
      TurnstileSecretKey: '',
      DefaultUserTags: [],
      // 流量统计配置





    },
    UserConfig: {
      Users: [],
    },
    SourceConfig: [],
    CustomCategories: [],
    LiveConfig: [],


    ClientAdSourceApis: [],
  };

  // 用户信息已迁移到新版数据库，不再填充 UserConfig.Users
  // 保持为空数组，避免与新版用户系统冲突
  adminConfig.UserConfig.Users = [];

  // 从配置文件中补充源信息
  Object.entries(cfgFile.api_site || []).forEach(([key, site]) => {
    adminConfig.SourceConfig.push({
      key: key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      from: 'config',
      disabled: false,
    });
  });

  // 从配置文件中补充自定义分类信息
  cfgFile.custom_category?.forEach((category) => {
    adminConfig.CustomCategories.push({
      name: category.name || category.query,
      type: category.type,
      query: category.query,
      from: 'config',
      disabled: false,
    });
  });

  // 从配置文件中补充直播源信息
  Object.entries(cfgFile.lives || []).forEach(([key, live]) => {
    if (!adminConfig.LiveConfig) {
      adminConfig.LiveConfig = [];
    }
    adminConfig.LiveConfig.push({
      key,
      name: live.name,
      url: live.url,
      ua: live.ua,
      epg: live.epg,
      channelNumber: 0,
      from: 'config',
      disabled: false,
    });
  });

  return adminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  // 直接使用内存缓存
  if (cachedConfig) {
    return cachedConfig;
  }

  // 如果正在初始化，等待初始化完成
  if (configInitPromise) {
    return configInitPromise;
  }

  // 创建初始化 Promise
  configInitPromise = (async () => {
    const storageType = 'upstash';

    // localStorage 模式下直接从环境变量初始化


    // 读 db
    let adminConfig: AdminConfig | null = null;
    let dbReadFailed = false;
    try {
      adminConfig = await db.getAdminConfig();
    } catch (e) {
      console.error('获取管理员配置失败:', e);
      dbReadFailed = true;
    }

    // db 中无配置，执行一次初始化
    if (!adminConfig) {
      if (dbReadFailed) {
        // 数据库读取失败，使用默认配置但不保存，避免覆盖数据库
        console.warn('数据库读取失败，使用临时默认配置（不会保存到数据库）');
        adminConfig = await getInitConfig('');
      } else {
        // 数据库中确实没有配置，首次初始化并保存
        console.log('首次初始化配置');
        adminConfig = await getInitConfig('');
        await db.saveAdminConfig(adminConfig);
      }
    }

    // 检查是否有旧格式Emby配置需要迁移


    adminConfig = configSelfCheck(adminConfig);
    cachedConfig = adminConfig;

    // 如果进行了Emby配置迁移，保存到数据库


    // 自动迁移用户（如果配置中有用户且V2存储支持）
    // 过滤掉站长后检查是否有需要迁移的用户
    const nonOwnerUsers = adminConfig.UserConfig.Users.filter(
      (u) => u.username !== process.env.USERNAME
    );
    if (!dbReadFailed && nonOwnerUsers.length > 0) {
      try {
        // 检查是否支持V2存储
        const storage = (db as any).storage;
        if (storage && typeof storage.createUserV2 === 'function') {
          console.log('检测到配置中有用户，开始自动迁移...');
          await db.migrateUsersFromConfig(adminConfig);
          // 迁移完成后，清空配置中的用户列表并保存
          adminConfig.UserConfig.Users = [];
          await db.saveAdminConfig(adminConfig);
          cachedConfig = adminConfig;
          console.log('用户自动迁移完成');
        }
      } catch (error) {
        console.error('自动迁移用户失败:', error);
        // 不影响主流程，继续执行
      }
    }

    // 清除初始化 Promise
    configInitPromise = null;
    return cachedConfig;
  })();

  return configInitPromise;
}

export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  // 确保必要的属性存在和初始化
  if (!adminConfig.SiteConfig) {
    adminConfig.SiteConfig = {
      SiteName: 'MoonTVPlus',
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanProxyType: 'cmliussss-cdn-tencent',
      DoubanProxy: '',
      DoubanImageProxyType: 'cmliussss-cdn-tencent',
      DoubanImageProxy: '',
      DisableYellowFilter: false,
      FluidSearch: true,




      TMDBImageBaseUrl: DEFAULT_TMDB_IMAGE_BASE_URL,














      LoginRequireTurnstile: false,
      TurnstileSiteKey: '',
      TurnstileSecretKey: '',
      DefaultUserTags: [],
    };
  }
  // 确保弹幕配置存在





  // 本地设置云同步模式兜底

  // 确保评论开关存在

  // 确保公告显示模式存在
  if (adminConfig.SiteConfig.AnnouncementDisplayMode === undefined) {
    adminConfig.SiteConfig.AnnouncementDisplayMode =
      process.env.ANNOUNCEMENT_DISPLAY_MODE === 'every' ? 'every' : 'once';
  }




  if (adminConfig.SiteConfig.LoginRequireTurnstile === undefined) {
    adminConfig.SiteConfig.LoginRequireTurnstile = false;
  }
  if (adminConfig.SiteConfig.TurnstileSiteKey === undefined) {
    adminConfig.SiteConfig.TurnstileSiteKey = '';
  }
  if (adminConfig.SiteConfig.TurnstileSecretKey === undefined) {
    adminConfig.SiteConfig.TurnstileSecretKey = '';
  }
  if (adminConfig.SiteConfig.DefaultUserTags === undefined) {
    adminConfig.SiteConfig.DefaultUserTags = [];
  }
  // 流量统计配置补全













  if (!adminConfig.UserConfig) {
    adminConfig.UserConfig = { Users: [] };
  }
  if (
    !adminConfig.UserConfig.Users ||
    !Array.isArray(adminConfig.UserConfig.Users)
  ) {
    adminConfig.UserConfig.Users = [];
  }
  if (!adminConfig.SourceConfig || !Array.isArray(adminConfig.SourceConfig)) {
    adminConfig.SourceConfig = [];
  }
  if (
    !adminConfig.CustomCategories ||
    !Array.isArray(adminConfig.CustomCategories)
  ) {
    adminConfig.CustomCategories = [];
  }
  if (!adminConfig.LiveConfig || !Array.isArray(adminConfig.LiveConfig)) {
    adminConfig.LiveConfig = [];
  }

  if (
    !adminConfig.ClientAdSourceApis ||
    !Array.isArray(adminConfig.ClientAdSourceApis)
  ) {
    adminConfig.ClientAdSourceApis = [];
  }
  adminConfig.LiveRefreshIntervalHours = normalizeLiveRefreshIntervalHours(
    adminConfig.LiveRefreshIntervalHours
  );



  // 用户信息已迁移到新版数据库
  // 这里只保留站长用户用于兼容性，其他用户从数据库读取
  const ownerUser = process.env.USERNAME;
  adminConfig.UserConfig.Users = [
    {
      username: ownerUser!,
      role: 'owner',
      banned: false,
    },
  ];

  // 采集源去重
  const seenSourceKeys = new Set<string>();
  adminConfig.SourceConfig = adminConfig.SourceConfig.filter((source) => {
    if (seenSourceKeys.has(source.key)) {
      return false;
    }
    seenSourceKeys.add(source.key);
    return true;
  });

  const validSourceKeys = new Set(adminConfig.SourceConfig.map((source) => source.key));

  adminConfig.ClientAdSourceApis = Array.from(
    new Set((adminConfig.ClientAdSourceApis || []).filter((key) => validSourceKeys.has(key)))
  );

  // 自定义分类去重
  const seenCustomCategoryKeys = new Set<string>();
  adminConfig.CustomCategories = adminConfig.CustomCategories.filter(
    (category) => {
      if (seenCustomCategoryKeys.has(category.query + category.type)) {
        return false;
      }
      seenCustomCategoryKeys.add(category.query + category.type);
      return true;
    }
  );

  // 直播源去重
  const seenLiveKeys = new Set<string>();
  adminConfig.LiveConfig = adminConfig.LiveConfig.filter((live) => {
    if (seenLiveKeys.has(live.key)) {
      return false;
    }
    seenLiveKeys.add(live.key);
    return true;
  });

  // Emby配置迁移：将旧格式迁移到新格式





































  // 确保音乐配置存在




  // API Base URL 统一去尾斜杠，避免拼接路径时出现 //
  const site = adminConfig.SiteConfig;
  if (site) {
    site.DoubanProxy = normalizeApiBaseUrl(site.DoubanProxy);
    site.DoubanImageProxy = normalizeApiBaseUrl(site.DoubanImageProxy);

    site.TMDBProxy = normalizeApiBaseUrl(site.TMDBProxy);
    site.TMDBReverseProxy = normalizeApiBaseUrl(site.TMDBReverseProxy);
    site.TMDBImageBaseUrl = normalizeApiBaseUrl(
      site.TMDBImageBaseUrl || DEFAULT_TMDB_IMAGE_BASE_URL
    );











  }















  // 同步 TMDB 图片默认地址到轻量模块，供 getTMDBImageUrl 等服务端图片拼接使用
  setServerTmdbImageBaseUrl(adminConfig.SiteConfig?.TMDBImageBaseUrl);

  // 注意：OPDS source.url 是完整目录 URL，保留末尾 / 以便相对路径解析

  return adminConfig;
}

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await db.getAdminConfig();
  } catch (e) {
    console.error('获取管理员配置失败:', e);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion
  );
  cachedConfig = adminConfig;
  await db.saveAdminConfig(adminConfig);

  return;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

export async function getAvailableApiSites(
  user?: string,
  includeSpecialSources = false
): Promise<ApiSite[]> {
  const config = await getConfig();


  const allApiSites = config.SourceConfig.filter((s) => !s.disabled);

  if (!user) {
    return allApiSites;
  }

  // localStorage 模式下直接返回所有可用源
  const storageType = 'upstash';


  // 从V2存储中获取用户信息
  const userInfoV2 = await db.getUserInfoV2(user);
  if (!userInfoV2) {
    return allApiSites;
  }

  // 优先根据用户自己的 enabledApis 配置查找
  if (userInfoV2.enabledApis && userInfoV2.enabledApis.length > 0) {
    const userApiSitesSet = new Set(userInfoV2.enabledApis);
    return allApiSites
      .filter((s) => userApiSitesSet.has(s.key))
      .map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        detail: s.detail,
        proxyMode: s.proxyMode,
      }));
  }

  // 如果没有 enabledApis 配置，则根据 tags 查找
  if (userInfoV2.tags && userInfoV2.tags.length > 0 && config.UserConfig.Tags) {
    const enabledApisFromTags = new Set<string>();

    // 遍历用户的所有 tags，收集对应的 enabledApis
    userInfoV2.tags.forEach((tagName) => {
      const tagConfig = config.UserConfig.Tags?.find((t) => t.name === tagName);
      if (tagConfig && tagConfig.enabledApis) {
        tagConfig.enabledApis.forEach((apiKey) =>
          enabledApisFromTags.add(apiKey)
        );
      }
    });

    if (enabledApisFromTags.size > 0) {
      return allApiSites
        .filter((s) => enabledApisFromTags.has(s.key))
        .map((s) => ({
          key: s.key,
          name: s.name,
          api: s.api,
          detail: s.detail,
          proxyMode: s.proxyMode,
        }));
    }
  }

  // 如果都没有配置，返回所有可用的 API 站点
  return allApiSites;
}

export async function setCachedConfig(config: AdminConfig) {
  cachedConfig = config;
}

export async function clearConfigCache() {
  cachedConfig = null as any;
  configInitPromise = null;
}
