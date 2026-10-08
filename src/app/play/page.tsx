/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import { ArrowLeft, FileText, Heart, Keyboard, Link2, Loader2, Play, RefreshCw, Search, Sparkles, Star, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isAnimeCategoryText } from '@/lib/anime-keyword-expr';
import { createAnime4KRenderer } from '@/lib/anime4k';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { deleteFavorite, deleteSkipConfig, generateStorageKey, getAllPlayRecords, getSkipConfig, isFavorited, migratePlayRecord, saveFavorite, savePlayRecord, saveSkipConfig, subscribeToDataUpdates } from '@/lib/db.client';
import { getDoubanDetail } from '@/lib/douban.client';
import { cleanEpisodeDisplayName } from '@/lib/episode-display-name';
import { isEpisodeHiddenByFilter } from '@/lib/episode-filter';
import {
  buildEpisodeProgressContentKey,
  loadLocalEpisodeProgress,
  pruneLocalEpisodeProgressStorage,
  saveLocalEpisodeProgress,
} from '@/lib/episode-progress';
import type { EpisodeTitleCorrection } from '@/lib/episode-title-correction';
import {
  EPISODE_TITLE_CORRECTION_EVENT,
  getEpisodeTitleCorrection,
} from '@/lib/episode-title-correction';
import {
  getRecommendationCache,
  recommendationCacheKeys,
  setRecommendationCache,
} from '@/lib/recommendations/cache';
import { EpisodeFilterConfig, SearchResult } from '@/lib/types';
import { base58Decode, getVideoResolutionFromM3u8, processImageUrl } from '@/lib/utils';

import CorrectDialog from '@/components/CorrectDialog';
import DetailPanel from '@/components/DetailPanel';
import EpisodeSelector from '@/components/EpisodeSelector';
import LoadingStyle, {
  type LoadingStep,
  LoadingErrorStyle,
} from '@/components/LoadingStyle';
import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import Toast, { ToastProps } from '@/components/Toast';
import VideoCard from '@/components/VideoCard';



// 扩展 HTMLVideoElement 类型以支持 hls 属性
declare global {
  interface HTMLVideoElement {
    hls?: any;
  }
}

// Wake Lock API 类型声明
interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

interface PlayFallbackRecommendation {
  key: string;
  item: SearchResult;
  episodes?: number;
  sourceNames: string[];
  doubanId?: number;
}

interface SearchCachePayload {
  status: 'complete' | 'partial';
  results: SearchResult[];
  query: string;
  updatedAt: number;
}



type HarmonyHlsPlaybackMode = 'hlsjs' | 'native';










const PLAYBACK_RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const HARMONY_HLS_PLAYBACK_MODE_KEY = 'harmony_hls_playback_mode';






// libbitsub 以原生 ESM 形式自托管在 public/libbitsub/（由 next.config.js 从
// node_modules 拷贝），运行时绕过 webpack 加载，避免 wasm 胶水被 swc 压缩破坏。
// 注意必须运行时构造 URL：字面量 import('/libbitsub/...') 会被 OpenNext 的
// esbuild 在 server 产物里当作可解析模块而报 Could not resolve


const isHlsPlaybackUrl = (url: string) =>
  /\.m3u8?(?:$|[/?#])/i.test(url) ||
  url.includes('/api/proxy-m3u8') ||
  url.includes('/api/proxy/vod/m3u8');

const PLAY_SHORTCUT_GROUPS = [
  {
    title: '播放控制',
    items: [
      { keys: ['空格'], description: '播放 / 暂停' },
      { keys: ['←', '→'], description: '快退 / 快进 10 秒' },
      { keys: ['P'], description: '快捷快进' },
      { keys: ['↑', '↓'], description: '音量增加 / 减少' },
      { keys: ['F'], description: '切换全屏' },
    ],
  },
  {
    title: '剧集切换',
    items: [
      { keys: ['Alt', '←'], description: '上一集' },
      { keys: ['Alt', '→'], description: '下一集' },
    ],
  },
  {
    title: '倍速控制',
    items: [
      { keys: ['小键盘 +'], description: '提高一档倍速' },
      { keys: ['小键盘 -'], description: '降低一档倍速' },
      { keys: ['小键盘 /'], description: '恢复 1x' },
    ],
  },
];

/* -----------------------------------------------------------------------------
 * 初始化加载动画（后台「个性化配置 → 初始化加载样式」可切换旧版/方格/魔法阵）
 *
 * 步骤按真实入口生成，不是固定四步：
 *   directplay 入口 → 直链 → 就绪（两步，不经优选）
 *   其余入口       → 搜索/详情 → 优选 → 就绪（优选会被优选开关整个跳过）
 * 「搜索」用于没带 source/id 的入口，「详情」用于带 source+id 的入口，
 * 两者是第一步的两副面孔，不是先后两步。
 *
 * 款式本身见 components/LoadingStyle。
 * -------------------------------------------------------------------------- */
type LoadingStepKey = 'search' | 'detail' | 'direct' | 'prefer' | 'ready';

const LOADING_STEP_META: Record<LoadingStepKey, LoadingStep> = {
  search: { label: '搜索', icon: <Search /> },
  detail: { label: '详情', icon: <FileText /> },
  direct: { label: '直链', icon: <Link2 /> },
  prefer: { label: '优选', icon: <Star /> },
  ready: { label: '就绪', icon: <Play /> },
};

/* 播放器遮罩只有两步：初始化，然后播放。
 * 换源、换集对观众都只是「要播了」，用「换源」这类内部说法没人看得懂。 */
const VIDEO_LOAD_STEPS: LoadingStep[] = [
  { label: '初始化', icon: <Loader2 /> },
  { label: '播放', icon: <Play /> },
];

function PlayPageClient() {

  const router = useRouter();
  const searchParams = useSearchParams();





  const { siteName } = useSite();

  // 获取 Proxy M3U8 Token


  // 获取用户认证信息
  const authInfo = typeof window !== 'undefined' ? getAuthInfoFromBrowserCookie() : null;

  // 离线下载功能配置



  // -----------------------------------------------------------------------------
  // 状态变量（State）
  // -----------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  // 初始阶段/文案按入口定：带 source+id 是「获取详情」，directplay 是「准备直链」，
  // 都不该在首帧闪一下「搜索」（详见 initAll 里对应的赋值点）。
  const [loadingStage, setLoadingStage] = useState<
    'searching' | 'preferring' | 'fetching' | 'ready'
  >(() =>
    searchParams.get('source') && searchParams.get('id')
      ? 'fetching'
      : 'searching'
  );
  const [loadingMessage, setLoadingMessage] = useState(() =>
    searchParams.get('source') === 'directplay'
      ? '🎬 正在准备直链播放...'
      : searchParams.get('source') && searchParams.get('id')
        ? '🎬 正在获取视频详情...'
        : '🔍 正在搜索播放源...'
  );
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResult | null>(null);

  // TMDB背景图
  const [tmdbBackdrop, setTmdbBackdrop] = useState<string | null>(null);
  // TMDB 分集名称（按 episode_number-1 索引），复用背景请求解析出的 tmdbId 获取
  const [tmdbEpisodeNames, setTmdbEpisodeNames] = useState<string[]>([]);
  // 背景请求解析出的 tmdbId 字符串（形如 "tv:123"），供拉取分集名复用
  const [resolvedTmdbIdStr, setResolvedTmdbIdStr] = useState<string | null>(
    null
  );
  // 已发起 TMDB 分集名请求的 id，避免重复拉取
  const tmdbEpisodesFetchedIdRef = useRef<string | null>(null);
  // 「禁用集数标题获取并切换」全局开关（本地设置，进入播放页时读取一次）
  const [globalTitleFetchDisabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('disableEpisodeTitleFetch') === 'true';
  });
  // 「手动矫正标题」按剧集配置：随当前标题 / 用户矫正而更新
  const [titleCorrection, setTitleCorrection] = useState<EpisodeTitleCorrection>(
    {}
  );

  // 收藏状态
  const [favorited, setFavorited] = useState(false);

  // 网盘搜索弹窗状态



  // AI问片状态




  // 纠错弹窗状态
  const [showCorrectDialog, setShowCorrectDialog] = useState(false);

  // 详情面板状态
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // 快捷键说明弹窗状态
  const [showShortcutDialog, setShowShortcutDialog] = useState(false);

  useEffect(() => {
    if (!showShortcutDialog) {
      return;
    }

    const handleShortcutDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShortcutDialog(false);
      }
    };

    document.addEventListener('keydown', handleShortcutDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleShortcutDialogKeyDown);
    };
  }, [showShortcutDialog]);

  // 大屏设备检测（判断选集面板是否在右侧）
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // 检测是否为大屏设备
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 768); // md断点
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 抽屉管理：打开指定抽屉时关闭其他抽屉
  const openDrawer = (drawerName: 'pansou' | 'aiChat' | 'correct' | 'detail') => {
    if (!isLargeScreen) {
      // 小屏设备不需要互斥
      switch (drawerName) {
        case 'pansou':

          break;
        case 'aiChat':

          break;
        case 'correct':
          setShowCorrectDialog(true);
          break;
        case 'detail':
          setShowDetailPanel(true);
          break;
      }
      return;
    }

    // 大屏设备：关闭其他抽屉


    setShowCorrectDialog(drawerName === 'correct');
    setShowDetailPanel(drawerName === 'detail');
  };

  // 检查AI功能是否启用




  // 网页全屏状态 - 控制导航栏的显示隐藏
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);
  // 原生全屏状态
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // 监听浏览器原生全屏事件
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setIsNativeFullscreen(isFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 组件卸载时清理定时器


  // 跳过片头片尾配置
  const [skipConfig, setSkipConfig] = useState<{
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }>({
    enable: false,
    intro_time: 0,
    outro_time: 0,
  });
  const skipConfigRef = useRef(skipConfig);
  useEffect(() => {
    skipConfigRef.current = skipConfig;
  }, [
    skipConfig,
    skipConfig.enable,
    skipConfig.intro_time,
    skipConfig.outro_time,
  ]);

  // 快捷快进设置（默认 1 分 30 秒）
  const DEFAULT_QUICK_FORWARD_SECONDS = 90;
  const [quickForwardSeconds, setQuickForwardSeconds] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_QUICK_FORWARD_SECONDS;
    const saved = Number(localStorage.getItem('quickForwardSeconds'));
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_QUICK_FORWARD_SECONDS;
  });
  const quickForwardSecondsRef = useRef(quickForwardSeconds);
  useEffect(() => {
    quickForwardSecondsRef.current = quickForwardSeconds;
  }, [quickForwardSeconds]);

  // 跳过检查的时间间隔控制
  const lastSkipCheckRef = useRef(0);

  // 去广告开关（从 localStorage 继承，默认 true）
  const [blockAdEnabled, setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('enable_blockad');
      if (v !== null) return v === 'true';
    }
    return true;
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);
  useEffect(() => {
    blockAdEnabledRef.current = blockAdEnabled;
  }, [blockAdEnabled]);

  // 工具栏去广告开关：用于外部播放器及鸿蒙原生 HLS，默认 false
  const [externalPlayerAdBlock, setExternalPlayerAdBlock] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('external_player_adblock');
      if (v !== null) return v === 'true';
    }
    return false;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('external_player_adblock', String(externalPlayerAdBlock));
    }
  }, [externalPlayerAdBlock]);

  // 自定义去广告代码（从服务器获取并缓存）
  const customAdFilterCodeRef = useRef<string>('');

  // 初始化时获取自定义去广告代码
  useEffect(() => {
    const fetchAdFilterCode = async () => {
      if (typeof window === 'undefined') return;

      try {
        // 先从 localStorage 获取缓存的代码，立即可用
        const cachedCode = localStorage.getItem('custom_ad_filter_code_cache');
        const cachedVersion = localStorage.getItem('custom_ad_filter_version_cache');

        if (cachedCode) {
          customAdFilterCodeRef.current = cachedCode;
          console.log('使用缓存的去广告代码');
        }

        // 从 window.RUNTIME_CONFIG 获取版本号
        const version = (window as any).RUNTIME_CONFIG?.CUSTOM_AD_FILTER_VERSION || 0;

        // 如果版本号为 0，说明去广告未设置，清空缓存并跳过
        if (version === 0) {
          console.log('去广告代码未设置（版本 0），清空缓存');
          localStorage.removeItem('custom_ad_filter_code_cache');
          localStorage.removeItem('custom_ad_filter_version_cache');
          customAdFilterCodeRef.current = '';
          return;
        }

        // 如果版本号不一致或没有缓存，才获取完整代码
        if (!cachedVersion || parseInt(cachedVersion) !== version) {
          console.log('检测到去广告代码更新（版本 ' + version + '），获取最新代码');

          // 获取完整代码
          const fullResponse = await fetch('/api/ad-filter?full=true');
          if (!fullResponse.ok) {
            console.warn('获取完整去广告代码失败，使用缓存');
            return;
          }

          const { code } = await fullResponse.json();

          if (code) {
            localStorage.setItem('custom_ad_filter_code_cache', code);
            localStorage.setItem('custom_ad_filter_version_cache', version.toString());
            customAdFilterCodeRef.current = code;
          } else if (!cachedCode) {
            // 如果服务器没有代码且本地也没有缓存，清空缓存
            localStorage.removeItem('custom_ad_filter_code_cache');
            localStorage.removeItem('custom_ad_filter_version_cache');
          }
        } else {
          console.log('去广告代码已是最新版本（版本 ' + version + '）');
        }
      } catch (error) {
        console.error('获取去广告代码配置失败:', error);
        // 失败时已经使用了缓存，无需额外处理
      }
    };

    fetchAdFilterCode();
  }, []);

  // Anime4K超分相关状态
  const [webGPUSupported, setWebGPUSupported] = useState<boolean>(false);
  const [anime4kEnabled, setAnime4kEnabled] = useState<boolean>(false);
  const [anime4kMode, setAnime4kMode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('anime4k_mode');
      if (v !== null) return v;
    }
    return 'ModeA';
  });
  const [anime4kScale, setAnime4kScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('anime4k_scale');
      if (v !== null) return parseFloat(v);
    }
    return 2.0;
  });
  const anime4kRef = useRef<any>(null);
  const anime4kEnabledRef = useRef(anime4kEnabled);
  const anime4kModeRef = useRef(anime4kMode);
  const anime4kScaleRef = useRef(anime4kScale);
  useEffect(() => {
    anime4kEnabledRef.current = anime4kEnabled;
    anime4kModeRef.current = anime4kMode;
    anime4kScaleRef.current = anime4kScale;
  }, [anime4kEnabled, anime4kMode, anime4kScale]);

  // 检测WebGPU支持
  useEffect(() => {
    const checkWebGPUSupport = async () => {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        setWebGPUSupported(false);
        console.log('WebGPU不支持：浏览器不支持WebGPU API');
        return;
      }

      try {
        // 修复anime4k-webgpu库的buffer size限制问题
        // 在全局层面patch requestAdapter，确保所有adapter都有正确的limits
        const originalRequestAdapter = (navigator as any).gpu.requestAdapter.bind((navigator as any).gpu);

        (navigator as any).gpu.requestAdapter = async (options?: any) => {
          const adapter = await originalRequestAdapter(options);
          if (!adapter) return adapter;

          // 保存原始的requestDevice方法
          const originalRequestDevice = adapter.requestDevice.bind(adapter);

          // 重写requestDevice方法，添加必要的buffer size限制
          adapter.requestDevice = async (descriptor?: any) => {
            const adapterLimits = adapter.limits;

            // 合并用户提供的descriptor和我们需要的limits
            const enhancedDescriptor = {
              ...descriptor,
              requiredLimits: {
                ...descriptor?.requiredLimits,
                // 使用adapter支持的最大值，但不超过2GB
                maxBufferSize: Math.min(adapterLimits.maxBufferSize || 2147483648, 2147483648),
                maxStorageBufferBindingSize: Math.min(adapterLimits.maxStorageBufferBindingSize || 1073741824, 1073741824),
              }
            };

            console.log('WebGPU设备请求配置:', enhancedDescriptor.requiredLimits);
            return originalRequestDevice(enhancedDescriptor);
          };

          return adapter;
        };

        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
          setWebGPUSupported(false);
          console.log('WebGPU不支持：无法获取GPU适配器');
          return;
        }

        setWebGPUSupported(true);
        console.log('WebGPU支持检测：✅ 支持');
        console.log('Adapter limits:', {
          maxBufferSize: adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize
        });
      } catch (err) {
        setWebGPUSupported(false);
        console.log('WebGPU不支持：', err);
      }
    };

    checkWebGPUSupport();
  }, []);

  // 弹幕相关状态



  const [episodeFilterConfig, setEpisodeFilterConfig] = useState<EpisodeFilterConfig | null>(null);
  const episodeFilterConfigRef = useRef<EpisodeFilterConfig | null>(null);


  // 弹幕自动装填是否已「尘埃落定」（搜索完成/无源/已禁用）。
  // 动漫优先用弹幕，需等它落定后再决定是否降级拉取 TMDB 分集名。







  // 弹幕显示状态的 ref，初始化时从 localStorage 读取


  // 弹幕热力图完全禁用开关（默认不禁用，即启用热力图功能）




  // 弹幕热力图开关（默认开启）




  // 多条弹幕匹配结果



   // 当前搜索使用的关键词
  const [toast, setToast] = useState<ToastProps | null>(null);




  // 初始化弹幕模块（清理过期缓存）


  // 加载弹幕过滤配置


  // 同步弹幕过滤配置到ref


  // 同步集数过滤配置到ref
  useEffect(() => {
    episodeFilterConfigRef.current = episodeFilterConfig;
  }, [episodeFilterConfig]);

  // 视频基本信息
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '');
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '');
  const [videoCover, setVideoCover] = useState('');
  const [videoDoubanId, setVideoDoubanId] = useState(0);

  // 更新浏览器标题
  useEffect(() => {
    if (videoTitle) {
      document.title = `${siteName} - ${videoTitle}`;
    } else {
      document.title = siteName;
    }
  }, [videoTitle, siteName]);
  // 豆瓣评分数据
  const [doubanRating, setDoubanRating] = useState<{
    value: number;
    count: number;
    star_count: number;
  } | null>(null);
  // 豆瓣额外信息
  const [doubanCardSubtitle, setDoubanCardSubtitle] = useState<string>('');
  const [doubanAka, setDoubanAka] = useState<string[]>([]);
  const [doubanYear, setDoubanYear] = useState<string>(''); // 从 pubdate 提取的年份

  // 纠错后的描述信息（用于显示，不触发 detail 更新）
  const [correctedDesc, setCorrectedDesc] = useState<string>('');



  // 当前源和ID - source 直接存储完整格式（如 'emby_wumei' 或 'emby'）
  const [currentSource, setCurrentSource] = useState(searchParams.get('source') || '');
  const isDirectPlay = searchParams.get('source') === 'directplay';
 const videoMediaTypeRef = useRef('');
 const fileName = '';
 const [currentId, setCurrentId] = useState(searchParams.get('id') || '');
  const sourceProxyMode = Boolean(detail?.proxyMode);

   // 小雅源：用户点击的文件名




  // 解析 source 参数以获取 embyKey（仅用于 API 调用）
  const parseSourceForApi = (source: string): {source: string} => ({source});

  const isM3u8LikeUrl = (url?: string) => {
    if (!url) return false;
    const normalizedUrl = url.toLowerCase();
    return normalizedUrl.includes('.m3u8') || normalizedUrl.includes('/m3u8/');
  };

  const buildAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // 搜索所需信息
  const [searchTitle] = useState(searchParams.get('stitle') || '');
  const [searchType] = useState(searchParams.get('stype') || '');
  const [initialEpisodeProgressTitle] = useState(
    searchTitle || searchParams.get('title') || ''
  );
  const [initialEpisodeProgressYear] = useState(
    searchParams.get('year') || ''
  );

  // 全局开关或「本剧集被禁用」任一命中即禁用集数标题获取；
  // 矫正配置按标题（与传给 EpisodeSelector 的 videoTitle 一致）读取，随标题变化与矫正事件同步
  const episodeTitleFetchDisabled =
    globalTitleFetchDisabled || !!titleCorrection.disabled;
  useEffect(() => {
    const key = searchTitle || videoTitle;
    const sync = () => setTitleCorrection(getEpisodeTitleCorrection(key));
    sync();
    window.addEventListener(EPISODE_TITLE_CORRECTION_EVENT, sync);
    return () =>
      window.removeEventListener(EPISODE_TITLE_CORRECTION_EVENT, sync);
  }, [searchTitle, videoTitle]);
  const episodeProgressContentKey = useMemo(
    () =>
      buildEpisodeProgressContentKey({
        doubanId: videoDoubanId || detail?.douban_id,
        tmdbId: detail?.tmdb_id,
        title: initialEpisodeProgressTitle,
        year: initialEpisodeProgressYear,
        searchType,
      }),
    [
      detail?.douban_id,
      detail?.tmdb_id,
      initialEpisodeProgressTitle,
      initialEpisodeProgressYear,
      searchType,
      videoDoubanId,
    ]
  );

  // 是否需要优选
  const [needPrefer, setNeedPrefer] = useState(
    searchParams.get('prefer') === 'true'
  );
  const needPreferRef = useRef(needPrefer);
  useEffect(() => {
    needPreferRef.current = needPrefer;
  }, [needPrefer]);
  // 集数相关
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    const episodeParam = searchParams.get('episode');
    if (episodeParam) {
      const episode = parseInt(episodeParam, 10);
      return episode > 0 ? episode - 1 : 0; // URL 中是 1-based，内部是 0-based
    }
    return 0;
  });

  // 监听 URL 参数变化，更新集数索引（用于房员跟随换集）
  useEffect(() => {
    const episodeParam = searchParams.get('episode');
    if (episodeParam) {
      const episode = parseInt(episodeParam, 10);
      const newIndex = episode > 0 ? episode - 1 : 0;
      console.log('[PlayPage] Checking episode from URL:', { urlEpisode: episode, currentIndex: currentEpisodeIndex, newIndex });
      if (newIndex !== currentEpisodeIndex) {
        console.log('[PlayPage] URL episode changed, updating index to:', newIndex);
        setCurrentEpisodeIndex(newIndex);
      }
    }
  }, [searchParams, currentEpisodeIndex]);

  // 监听集数变化，移除已显示的跳转按钮
  useEffect(() => {
    // 移除已显示的跳转按钮
    if (playRecordJumpLayerRef.current && artPlayerRef.current) {
      try {
        artPlayerRef.current.layers.remove('play-record-jump');
        playRecordJumpLayerRef.current = null;
      } catch (err) {
        console.warn('[PlayRecordJump] 移除跳转按钮失败:', err);
      }
    }

    // 用户主动切集/自动下一集时不再弹“上次播放到 xx”。
    // 首次进入页面仍保留检查能力，用于展示继续播放提示。
    if (suppressPlayRecordJumpOnNextEpisodeChangeRef.current) {
      playRecordJumpInitialCheckRef.current = false;
      playRecordJumpDismissedRef.current = true;
      suppressPlayRecordJumpOnNextEpisodeChangeRef.current = false;
      return;
    }

    playRecordJumpInitialCheckRef.current = true;
    playRecordJumpDismissedRef.current = false;
  }, [currentEpisodeIndex]);

  // 监听 URL 参数变化，当切换到不同视频时重新加载页面
  useEffect(() => {
    const urlTitle = searchParams.get('title') || '';
    const reloadParam = searchParams.get('_reload');

    // 只在有 _reload 参数且标题变化时才重新加载页面
    // 这样可以避免初始化、API返回、房间同步等场景的误触发
    // 只有用户主动点击推荐时才会添加 _reload 参数
    if (reloadParam && urlTitle && urlTitle !== videoTitle && !isSourceChangingRef.current) {
      console.log('[PlayPage] User clicked recommendation, reloading page');
      window.location.reload();
    }

    // 重置换源标记
    isSourceChangingRef.current = false;
  }, [searchParams, videoTitle]);

  const currentSourceRef = useRef(currentSource);
  const currentIdRef = useRef(currentId);
  const videoTitleRef = useRef(videoTitle);
  const videoYearRef = useRef(videoYear);
  const detailRef = useRef<SearchResult | null>(detail);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);
  const isSourceChangingRef = useRef(false); // 标记是否正在换源

  // 同步最新值到 refs
  useEffect(() => {
    currentSourceRef.current = currentSource;
    currentIdRef.current = currentId;
    detailRef.current = detail;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    videoTitleRef.current = videoTitle;
    videoYearRef.current = videoYear;
  }, [
    currentSource,
    currentId,
    detail,
    currentEpisodeIndex,
    videoTitle,
    videoYear,
  ]);

  // 当集数改变时，重置下集预缓存标记
  useEffect(() => {
    nextEpisodePreCacheTriggeredRef.current = false;

    // 清理之前的预缓存 HLS 实例
    if (nextEpisodePreCacheHlsRef.current) {
      try {
        nextEpisodePreCacheHlsRef.current.destroy();
      } catch (e) {
        console.error('清理预缓存 HLS 实例失败:', e);
      }
      nextEpisodePreCacheHlsRef.current = null;
    }
  }, [currentEpisodeIndex]);

  // 监听剧集切换，自动加载对应的弹幕


  // 正在进行的弹幕加载（同一集并发去重，避免换集重建播放器时重复搜索导致选择弹窗弹出两次）

  // 弹幕自动加载逻辑的最新引用（由下方 effect 赋值，供播放器插件就绪后重入同一流程）


  // 统一写入弹幕完整分集列表：更新 state，并按视频标题做 LRU 缓存，供下次进入复用


  // 自动加载指定集数弹幕的统一入口（剧集切换与播放器插件就绪共用，内部去重）
  // 返回 'done' 表示该集已处理（含已弹出选择弹窗）；'retry' 表示因弹幕插件未就绪等原因放弃，待插件就绪后可重新触发


  useEffect(() => {
    // 等待初始化完成（播放记录恢复完成）
    if (loading) {
      return;
    }



    // 检查集数是否有效
    if (currentEpisodeIndex < 0 || !videoTitle) {
      return;
    }

    console.log(`[弹幕] 剧集切换到第 ${currentEpisodeIndex + 1} 集，自动加载弹幕`);

    // 自动加载弹幕的逻辑（挂到 ref 上，供播放器插件就绪后通过 loadDanmakuForEpisode 重入）





  }, [currentEpisodeIndex, videoTitle, loading, isDirectPlay]);

  // 获取豆瓣评分数据
  useEffect(() => {
    const fetchDoubanRating = async () => {


      if (!videoDoubanId || videoDoubanId === 0) {
        setDoubanRating(null);
        setDoubanCardSubtitle('');
        setDoubanAka([]);
        setDoubanYear('');
        return;
      }

      try {
        const doubanData = await getDoubanDetail(videoDoubanId.toString());

        // 设置评分
        if (doubanData.rating) {
          setDoubanRating({
            value: doubanData.rating.value,
            count: doubanData.rating.count,
            star_count: doubanData.rating.star_count,
          });
        } else {
          setDoubanRating(null);
        }

        // 设置 card_subtitle
        if (doubanData.card_subtitle) {
          setDoubanCardSubtitle(doubanData.card_subtitle);
        }

        // 设置 aka（别名）
        if (doubanData.aka && doubanData.aka.length > 0) {
          setDoubanAka(doubanData.aka);
        }

        // 处理 pubdate 获取年份
        if (doubanData.pubdate && doubanData.pubdate.length > 0) {
          const pubdateStr = doubanData.pubdate[0];
          // 删除括号中的内容，包括括号
          const yearMatch = pubdateStr.replace(/\([^)]*\)/g, '').trim();
          if (yearMatch) {
            setDoubanYear(yearMatch);
          }
        }
      } catch (error) {
        console.error('获取豆瓣评分失败:', error);
        setDoubanRating(null);
        setDoubanCardSubtitle('');
        setDoubanAka([]);
        setDoubanYear('');
      }
    };

    fetchDoubanRating();
  }, [videoDoubanId, isDirectPlay]);

  // 获取TMDB背景图
  useEffect(() => {
    const fetchTMDBBackdrop = async () => {


      // 检查是否禁用背景图
      if (typeof window !== 'undefined') {
        const disabled = localStorage.getItem('tmdb_backdrop_disabled');
        if (disabled === 'true') {
          setTmdbBackdrop(null);
          return;
        }
      }

      if (!videoTitle) {
        setTmdbBackdrop(null);
        setTmdbEpisodeNames([]);
        setResolvedTmdbIdStr(null);
        return;
      }

      try {
        const mappingCacheKey = recommendationCacheKeys.tmdbTitleMapping(videoTitle);
        const cachedId = getRecommendationCache<string>(mappingCacheKey);

        if (cachedId) {
          console.log('使用缓存的TMDB ID映射');
          // 记录 tmdbId，交由懒加载按需拉取分集名称（弹幕优先，降级 TMDB）
          setResolvedTmdbIdStr(cachedId);

          const detailsCacheKey = recommendationCacheKeys.tmdbDetails(cachedId);
          const detailsCache = getRecommendationCache<any>(detailsCacheKey);

          if (detailsCache) {
            if (detailsCache.backdrop) {
              setTmdbBackdrop(processImageUrl(detailsCache.backdrop));
            } else {
              setTmdbBackdrop(null);
            }

            if (!videoDoubanId || videoDoubanId === 0) {
              populateDoubanFieldsFromTMDB(detailsCache);
            }
            populatePlayMetadataFromTMDB(detailsCache);
            return;
          }
        }

        // 构建请求URL
        const url = cachedId
          ? `/api/tmdb-details?cachedId=${encodeURIComponent(cachedId)}`
          : `/api/tmdb-details?title=${encodeURIComponent(videoTitle)}`;

        const response = await fetch(url);

        if (!response.ok) {
          setTmdbBackdrop(null);
          return;
        }

        const result = await response.json();

        if (result.backdrop) {
          setTmdbBackdrop(processImageUrl(result.backdrop));
        } else {
          setTmdbBackdrop(null);
        }

        // 如果没有豆瓣ID，使用TMDb数据补充
        if (!videoDoubanId || videoDoubanId === 0) {
          populateDoubanFieldsFromTMDB(result);
        }
        populatePlayMetadataFromTMDB(result);

        // 保存title到tmdbId的映射到localStorage（1个月）
        if (result.tmdbId) {
          // 记录 tmdbId，交由懒加载按需拉取分集名称
          setResolvedTmdbIdStr(String(result.tmdbId));
          try {
            setRecommendationCache(mappingCacheKey, String(result.tmdbId));

            const detailsCacheKey = recommendationCacheKeys.tmdbDetails(result.tmdbId);
            setRecommendationCache(detailsCacheKey, result);
          } catch (e) {
            console.error('保存缓存失败:', e);
          }
        }
      } catch (error) {
        console.error('获取TMDB背景图失败:', error);
        setTmdbBackdrop(null);
      }
    };

    const populatePlayMetadataFromTMDB = (tmdbData: any) => {
      const currentDetail = detailRef.current;
      if (!currentDetail) return;
const tmdbYear = tmdbData.releaseDate?.split('-')[0] || '';
      const shouldReplaceDesc =
        !currentDetail.desc ||
        currentDetail.desc.startsWith('临时播放目录：') ||
        currentDetail.desc.startsWith('移动云盘分享：');

      const resolvedTmdbId = typeof tmdbData.tmdbId === 'string'
        ? Number(String(tmdbData.tmdbId).split(':')[1] || 0)
        : tmdbData.tmdbId;



      setDetail((prev) => {
        if (!prev) return prev;


        return {
          ...prev,
          poster: prev.poster || tmdbData.poster || '',
          year: prev.year || tmdbYear,
          desc: shouldReplaceDesc ? (tmdbData.overview || prev.desc) : prev.desc,
          tmdb_id: prev.tmdb_id || resolvedTmdbId,
        };
      });

      if (tmdbData.overview && (!correctedDesc || currentDetail.desc?.startsWith('临时播放目录：'))) {
        setCorrectedDesc(tmdbData.overview);
      }

      if (tmdbData.poster && !currentDetail.poster) {
        setVideoCover(processImageUrl(tmdbData.poster));
      }

      if (tmdbYear && !currentDetail.year) {
        setVideoYear(tmdbYear);
      }
    };

    // 辅助函数：使用TMDb数据填充豆瓣字段
    const populateDoubanFieldsFromTMDB = (tmdbData: any) => {
      // 设置评分
      if (tmdbData.rating) {
        const ratingValue = parseFloat(tmdbData.rating);
        setDoubanRating({
          value: ratingValue,
          count: 0, // TMDb不提供评分人数
          star_count: Math.round(ratingValue / 2), // 转换为5星制
        });
      }

      // 设置年份
      if (tmdbData.releaseDate) {
        const year = tmdbData.releaseDate.split('-')[0];
        setDoubanYear(year);
      }

      // 设置card_subtitle（优先使用genres标签，否则使用年份和类型）
      if (tmdbData.genres && Array.isArray(tmdbData.genres) && tmdbData.genres.length > 0) {
        const genreNames = tmdbData.genres.map((g: any) => g.name).join(' / ');
        setDoubanCardSubtitle(genreNames);
      } else if (tmdbData.mediaType && tmdbData.releaseDate) {
        // 兜底：如果没有genres，使用年份和类型
        const year = tmdbData.releaseDate.split('-')[0];
        const typeText = tmdbData.mediaType === 'movie' ? '电影' : '电视剧';
        setDoubanCardSubtitle(`${year} / ${typeText}`);
      }
    };

    fetchTMDBBackdrop();
  }, [videoTitle, videoDoubanId, isDirectPlay]);

  // 复用背景请求解析出的 tmdbId，拉取该剧集当前季的分集名称（懒加载，按需触发）
  const loadTmdbEpisodeNames = useCallback(
    async (tmdbIdStr: string, seasonOverride?: number) => {
      try {
        const [mediaType, idPart] = tmdbIdStr.split(':');
        const id = parseInt(idPart, 10);
        if (mediaType !== 'tv' || !id) {
          return;
        }

        // 季度：优先手动指定，否则从标题解析，缺省第 1 季
        let seasonNumber = seasonOverride;
        if (!seasonNumber || seasonNumber < 1) {
          const seasonMatch =
            videoTitle?.match(/第\s*(\d+)\s*[季部]/) ||
            videoTitle?.match(/[Ss]eason\s*(\d+)/) ||
            videoTitle?.match(/\bS(\d+)\b/);
          const parsedSeason = seasonMatch ? parseInt(seasonMatch[1], 10) : NaN;
          seasonNumber =
            Number.isNaN(parsedSeason) || parsedSeason < 1 ? 1 : parsedSeason;
        }

        // 指纹含 id + 季，避免重复拉取；手动改季时可重新拉取
        const fingerprint = `${tmdbIdStr}#s${seasonNumber}`;
        if (tmdbEpisodesFetchedIdRef.current === fingerprint) {
          return;
        }
        tmdbEpisodesFetchedIdRef.current = fingerprint;

        const resp = await fetch(
          `/api/tmdb/episodes?id=${id}&season=${seasonNumber}`
        );
        if (!resp.ok) return;
        const season = await resp.json();
        const eps = season?.episodes;
        if (!Array.isArray(eps) || eps.length === 0) return;

        const names: string[] = [];
        eps.forEach((ep: any) => {
          const num =
            typeof ep?.episode_number === 'number' ? ep.episode_number : NaN;
          if (!Number.isNaN(num) && num >= 1 && ep?.name) {
            names[num - 1] = String(ep.name);
          }
        });
        if (names.some((n) => n && n.trim() !== '')) {
          setTmdbEpisodeNames(names);
        }
      } catch (err) {
        console.error('获取TMDB分集名称失败:', err);
      }
    },
    [videoTitle]
  );

  // 换剧时重置分集名相关状态
  useEffect(() => {
    tmdbEpisodesFetchedIdRef.current = null;
    setTmdbEpisodeNames([]);

  }, [videoTitle]);

  // 换剧时用弹幕完整分集列表缓存（LRU）预填 danmakuEpisodesList，
  // 使命中缓存时无需重新搜索即可展示列表视图；无缓存则清空。


  // 总集数
  const totalEpisodes = detail?.episodes?.length || 0;

  // 是否为动漫内容（决定分集名来源优先级：动漫弹幕优先，非动漫 TMDB 优先）
  const isAnimeContent = useMemo(
    () => isAnimeCategoryText(detail?.type_name, detail?.class),
    [detail?.type_name, detail?.class]
  );

  // 分集标题里出现多个季度（SxxExx 中含 ≥2 个不同季号）时，弹幕（按番剧单季编号）无法跨季对齐、不可靠，
  // 此时无论是否动漫都改用 TMDB。
  const hasMultipleSeasons = useMemo(() => {
    const titles = detail?.episodes_titles;
    if (!titles || titles.length === 0) return false;
    const seasons = new Set<number>();
    for (const t of titles) {
      const m = t?.match(/[Ss](\d+)[Ee]\d+/);
      if (m) seasons.add(parseInt(m[1], 10));
      if (seasons.size >= 2) return true;
    }
    return false;
  }, [detail?.episodes_titles]);

  // 分集名是否 TMDB 优先：手动矫正优先（弹幕优先→false / 指定 TMDB→true），
  // 否则默认按类型：非动漫，或虽是动漫但含多个季度（弹幕不可靠）
  const preferTmdbNames = titleCorrection.tmdbId
    ? true
    : !isAnimeContent || hasMultipleSeasons;

  // 手动指定的 TMDB 剧集串（覆盖自动解析）
  const effectiveTmdbIdStr = titleCorrection.tmdbId
    ? `tv:${titleCorrection.tmdbId}`
    : resolvedTmdbIdStr;

  // 弹幕分集名（按番号对齐视频集，需完整分集列表；由 LRU 缓存或主动搜索提供）。
  // 去掉来源标记与集号后仍有实质内容才返回，否则返回 null（视为不可用）。


  // 拉取 TMDB 分集名。TMDB 优先（非动漫或多季度动漫）：解析出 tmdbId 后即请求；
  // 弹幕优先（单季动漫）：先等弹幕自动装填「尘埃落定」，且仅在弹幕未产出可用标题时才降级拉 TMDB。
  // 手动「弹幕优先」时完全不搜 TMDB；手动指定 TMDB 时用指定的 id/季。




  // 视频播放地址
  const [videoUrl, setVideoUrl] = useState('');


  // 鸿蒙浏览器使用原生 HLS 时，video.currentSrc 会保留真实 m3u8，便于浏览器投屏。
  const [isHarmonyOS] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      /OpenHarmony/i.test(navigator.userAgent)
  );
  const [harmonyHlsPlaybackMode, setHarmonyHlsPlaybackMode] =
    useState<HarmonyHlsPlaybackMode>(() => {
      if (
        typeof navigator === 'undefined' ||
        !/OpenHarmony/i.test(navigator.userAgent)
      ) {
        return 'hlsjs';
      }

      try {
        const savedMode = localStorage.getItem(HARMONY_HLS_PLAYBACK_MODE_KEY);
        return savedMode === 'native' ? 'native' : 'hlsjs';
      } catch {
        return 'hlsjs';
      }
    });
  const nativeHlsAdBlockEnabled =
    isHarmonyOS &&
    harmonyHlsPlaybackMode === 'native' &&
    externalPlayerAdBlock;

  // 网盘挂载（openlist / xiaoya / netdisk-*）原生 HLS：Edge/Safari 可原生播放 m3u8，
  // 直连网盘 CDN，无需代理与去广告，播放更快。仅对支持原生 HLS 的浏览器启用。
  const [supportsNativeHls] = useState(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    try {
      const video = document.createElement('video');
      const result = video.canPlayType?.('application/vnd.apple.mpegurl');
      return result === 'probably' || result === 'maybe';
    } catch {
      return false;
    }
  });


  // 视频清晰度列表
  const [videoQualities, setVideoQualities] = useState<Array<{ name: string, url: string }>>([]);

  // Xiaoya链接刷新相关状态
   // 是否正在刷新链接
   // 重试计数
   // 上次刷新时间
   // 14分钟定时器
   // 当前xiaoya原始URL（用于刷新）
   // 播放链接媒体类型（openlist 探测后注入，用于单文件直连分流）
  // 当前视频是否已因 CORS 失败回退 no-cors（无扩展注入 ACAO 的 CDN 直链）。
  // 先乐观设置 crossOrigin（配 moontvplus-extension 注入 ACAO 供 Anime4K 读帧），
  // 首次播放 error 时一次性回退，之后不再恢复 crossOrigin。切集/换源时重置。
  const mediaCorsFallbackRef = useRef(false);
   // 标记是否为首次加载
  // xiaoya 仅 m3u8 可续期；openlist 由 refresh14m 决定。用于 startRefreshTimer 自身兜底校验

  const suppressPlayRecordJumpOnNextEpisodeChangeRef = useRef(false); // 主动切集时不显示播放记录跳转提示

  // 视频源代理模式状态


  const resolveCurrentExternalPlaybackUrl = async () => {
    let urlToUse = videoUrl;
    if (sourceProxyMode && detail?.episodes && currentEpisodeIndex < detail.episodes.length) {
      urlToUse = detail.episodes[currentEpisodeIndex];
    }

    if (!urlToUse) {
      return null;
    }

    return buildAbsoluteUrl(urlToUse);
  };





  // TMDB 分集名。TMDB(zh-CN)对无本地化标题的集数会返回「第 N 集」占位，
  // 与弹幕一样用 cleanEpisodeDisplayName 去集号：整列去号后无实质内容视为无有效名字（null），
  // 避免占位名把选集面板误切到列表视图。
  // 起始集数（startEpisode）：视频第 1 集对应 TMDB 第 startEpisode 集，据此平移取名。
  const tmdbRichNames = useMemo<(string | undefined)[] | null>(() => {
    if (totalEpisodes <= 1) return null;
    if (episodeTitleFetchDisabled) return null;
    const offset = Math.max(1, titleCorrection.startEpisode ?? 1) - 1;
    const names = Array.from({ length: totalEpisodes }, (_, i) => {
      const cleaned = cleanEpisodeDisplayName(tmdbEpisodeNames[offset + i]);
      return cleaned || undefined;
    });
    return names.some((n) => n) ? names : null;
  }, [
    totalEpisodes,
    episodeTitleFetchDisabled,
    tmdbEpisodeNames,
    titleCorrection.startEpisode,
  ]);

  // 选集列表的分集名称。优先级：
  //   单季动漫：弹幕优先（可纠错性高、番剧标题更贴合），降级 TMDB
  //   非动漫 / 多季度动漫：TMDB 优先，降级弹幕
  const richEpisodeNames = tmdbRichNames || [];
  const directEpisodeLabel = detail?.episodes_titles?.[currentEpisodeIndex] || '直链';
  const shouldShowEpisodeLabel = totalEpisodes > 1 || isDirectPlay;
  const episodeLabel = detail?.episodes_titles?.[currentEpisodeIndex] || `第 ${currentEpisodeIndex + 1} 集`;
  const playerEpisodeLabel = `第${currentEpisodeIndex + 1}集`;

  const loadSavedPlaybackRate = () => {
    if (typeof window === 'undefined') {
      return 1.0;
    }

    const raw = localStorage.getItem('preferredPlaybackRate');
    const parsed = raw ? Number(raw) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.0;
  };

  const persistPlaybackRate = (rate: number) => {
    if (typeof window === 'undefined' || !Number.isFinite(rate) || rate <= 0) {
      return;
    }

    localStorage.setItem('preferredPlaybackRate', String(rate));
  };

  const adjustPlaybackRateByStep = (direction: 1 | -1) => {
    if (!artPlayerRef.current) {
      return false;
    }

    // 观影室房员不能自行调整倍速，由房主同步控制


    const currentRate = artPlayerRef.current.playbackRate || 1;
    const currentIndex = PLAYBACK_RATE_OPTIONS.reduce((nearestIndex, rate, index) => {
      return Math.abs(rate - currentRate) < Math.abs(PLAYBACK_RATE_OPTIONS[nearestIndex] - currentRate)
        ? index
        : nearestIndex;
    }, 0);
    let nextIndex = -1;
    if (direction > 0) {
      nextIndex = PLAYBACK_RATE_OPTIONS.findIndex((rate) => rate > currentRate + 0.01);
    } else {
      for (let index = PLAYBACK_RATE_OPTIONS.length - 1; index >= 0; index--) {
        if (PLAYBACK_RATE_OPTIONS[index] < currentRate - 0.01) {
          nextIndex = index;
          break;
        }
      }
    }
    const boundedNextIndex = nextIndex === -1 ? currentIndex : nextIndex;
    const effectiveNextIndex = Math.min(
      Math.max(boundedNextIndex, 0),
      PLAYBACK_RATE_OPTIONS.length - 1
    );
    const nextRate = PLAYBACK_RATE_OPTIONS[effectiveNextIndex];

    artPlayerRef.current.playbackRate = nextRate;
    artPlayerRef.current.notice.show =
      effectiveNextIndex === currentIndex
        ? direction > 0
          ? `已是最高倍速：${nextRate}x`
          : `已是最低倍速：${nextRate}x`
        : `倍速：${nextRate}x`;
    return true;
  };

  const resetPlaybackRate = () => {
    if (!artPlayerRef.current) {
      return false;
    }

    // 观影室房员不能自行调整倍速，由房主同步控制


    artPlayerRef.current.playbackRate = 1;
    artPlayerRef.current.notice.show = '倍速：1x';
    return true;
  };

  const formatQuickForwardDuration = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
    }
    return `${seconds}秒`;
  };

  const seekQuickForward = () => {
    const player = artPlayerRef.current;
    if (!player) return false;

    const duration = Number.isFinite(player.duration) ? player.duration : Infinity;
    const nextTime = Math.min(duration, (player.currentTime || 0) + quickForwardSecondsRef.current);
    player.currentTime = nextTime;
    player.notice.show = `快进 ${formatQuickForwardDuration(quickForwardSecondsRef.current)}`;
    return true;
  };

  const isPlaybackThumbnailDisabled = () => {
    if (typeof window === 'undefined') {
      return true;
    }

    const saved = localStorage.getItem('disablePlaybackThumbnail');
    if (saved !== null) {
      return saved === 'true';
    }

    return true;
  };



  // 用于记录是否需要在播放器 ready 后跳转到指定进度
  const resumeTimeRef = useRef<number | null>(null);
  // 切换鸿蒙 HLS 内核时，同时恢复切换前的播放/暂停状态。
  const resumePlayingAfterHlsModeSwitchRef = useRef<boolean | null>(null);
  // 播放记录跳转按钮状态
  const playRecordJumpDismissedRef = useRef(false); // 记录用户是否已经关闭过跳转按钮
  const playRecordJumpLayerRef = useRef<any>(null); // 保存跳转按钮层的引用
  const playRecordJumpInitialCheckRef = useRef(true); // 记录是否是首次检查播放记录
  // 上次使用的音量，默认 0.7
  const lastVolumeRef = useRef<number>(0.7);
  // 上次使用的播放速率，默认 1.0
  const lastPlaybackRateRef = useRef<number>(loadSavedPlaybackRate());
  // Safari 切集时会短暂把 playbackRate 重置为 1，这里保留一段恢复窗口避免污染记忆值
  const playbackRateRestoreWindowUntilRef = useRef<number>(0);

  // 换源相关状态
  const [availableSources, setAvailableSources] = useState<SearchResult[]>([]);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null
  );
  const [fallbackRecommendations, setFallbackRecommendations] = useState<PlayFallbackRecommendation[]>([]);
  const [hasCompletedSearchRequest, setHasCompletedSearchRequest] = useState(false);
  const [backgroundSourcesLoading, setBackgroundSourcesLoading] = useState(false);
  const fallbackRecommendationsRowRef = useRef<HTMLDivElement>(null);
  const fallbackRecommendationsDraggingRef = useRef(false);
  const fallbackRecommendationsDragStartXRef = useRef(0);
  const fallbackRecommendationsDragStartScrollLeftRef = useRef(0);

  useEffect(() => {
    try {
      pruneLocalEpisodeProgressStorage();
    } catch (error) {
      console.warn('[Play] Failed to prune local episode progress:', error);
    }
  }, []);

  // 优选和测速开关
  const [optimizationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableOptimization');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch { // No recovery is needed here.
 }
      }
    }
    return true;
  });

  const [preferStrategy] = useState<'fast' | 'full'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferStrategy');
      if (saved === 'fast' || saved === 'full') {
        return saved;
      }
    }
    return 'fast';
  });

  // 优选偏好：综合判定(balanced) / 分辨率优先(resolution) / 网速优先(speed)
  const [preferMode] = useState<'balanced' | 'resolution' | 'speed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferMode');
      if (saved === 'balanced' || saved === 'resolution' || saved === 'speed') {
        return saved;
      }
    }
    return 'balanced';
  });

  // 保存优选时的测速结果，避免EpisodeSelector重复测速
  const [precomputedVideoInfo, setPrecomputedVideoInfo] = useState<
    Map<string, { quality: string; loadSpeed: string; pingTime: number; bitrate: string }>
  >(new Map());

  // 当前源的视频信息（用于标题旁边显示）
  const [currentSourceVideoInfo, setCurrentSourceVideoInfo] = useState<{
    quality: string;
    loadSpeed: string;
    pingTime: number;
    bitrate: string;
  } | null>(null);

  // 折叠状态（仅在 lg 及以上屏幕有效）
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);

  // 下载选集面板显示状态


  // 换源加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging' | 'episodeChanging'
  >('initing');
  const [videoError, setVideoError] = useState<string | null>(null);
  // 直链播放时 CORS 失败的原始 URL，用于显示"使用代理播放"按钮
  const [corsFailedUrl, setCorsFailedUrl] = useState<string | null>(null);
  // 标记当前视频是否已经尝试过代理（防止 415→直连→失败→代理 的无限循环）
  const proxyAttemptedRef = useRef(false);
  const videoUrlRequestSeqRef = useRef(0);
  const lastVideoRequestKeyRef = useRef<string | null>(null);

  // 直链代理域名记忆：检查某个域名是否需要代理

  // 将域名记录到代理列表


  // 播放器就绪状态（用于触发 usePlaySync 的事件监听器设置）
  const [playerReady, setPlayerReady] = useState(false);

  const handleFallbackRecommendationsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = fallbackRecommendationsRowRef.current;
    if (!container) return;

    if (container.scrollWidth <= container.clientWidth + 1) return;

    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const nextScrollLeft = container.scrollLeft + delta;
    const willScroll =
      (delta < 0 && container.scrollLeft > 0) ||
      (delta > 0 && container.scrollLeft < maxScrollLeft);

    if (!willScroll) return;

    e.preventDefault();
    container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
  };

  const handleFallbackRecommendationsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = fallbackRecommendationsRowRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    if (e.button !== 0) return;

    fallbackRecommendationsDraggingRef.current = true;
    fallbackRecommendationsDragStartXRef.current = e.clientX;
    fallbackRecommendationsDragStartScrollLeftRef.current = container.scrollLeft;
  };

  const handleFallbackRecommendationsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = fallbackRecommendationsRowRef.current;
    if (!container || !fallbackRecommendationsDraggingRef.current) return;

    const deltaX = e.clientX - fallbackRecommendationsDragStartXRef.current;
    container.scrollLeft = fallbackRecommendationsDragStartScrollLeftRef.current - deltaX;
  };

  const stopFallbackRecommendationsDragging = () => {
    fallbackRecommendationsDraggingRef.current = false;
  };

  // 播放进度保存相关
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const lastSavedPlayTimeRef = useRef<number | null>(null);

  // 下集预缓存相关
  const nextEpisodePreCacheTriggeredRef = useRef<boolean>(false);
  const nextEpisodePreCacheHlsRef = useRef<any>(null);


  const artPlayerRef = useRef<any>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  // 换集重建播放器前记住网页全屏状态，新播放器 ready 后恢复
  const restoreWebFullscreenOnReadyRef = useRef(false);
  const activeHarmonyHlsPlaybackModeRef =
    useRef<HarmonyHlsPlaybackMode | null>(null);

  const activeNativeHlsAdBlockRef = useRef<boolean | null>(null);
  const syncAnime4KCanvasFlip = (flip?: string) => {
    const canvas = anime4kRef.current?.canvas as HTMLCanvasElement | undefined;
    if (!canvas) return;

    const currentFlip = flip || artPlayerRef.current?.flip || 'normal';
    canvas.style.transformOrigin = 'center center';
    canvas.style.transform =
      currentFlip === 'horizontal'
        ? 'scaleX(-1)'
        : currentFlip === 'vertical'
          ? 'scaleY(-1)'
          : 'none';
  };





  // Wake Lock 相关
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 观影室同步功能


  // 观影室：一键创建房间（未加入房间时显示入口）





  // -----------------------------------------------------------------------------
  // 工具函数（Utils）
  // -----------------------------------------------------------------------------













  // 位图字幕（PGS）无法走 Artplayer 原生 track / JASSUB，需要专用渲染器




















  // PgsRenderer 无 setTrack 换轨接口：切换位图字幕 = 销毁重建


















  // 判断剧集状态
  const getSeriesStatus = (detail: SearchResult | null): 'completed' | 'ongoing' | 'unknown' => {
    if (!detail) return 'unknown';

    // 方法1：通过 vod_remarks 判断
    if (detail.vod_remarks) {
      const remarks = detail.vod_remarks.toLowerCase();
      // 判定为完结的关键词
      const completedKeywords = ['全', '完结', '大结局', 'end', '完'];
      // 判定为连载的关键词
      const ongoingKeywords = ['更新至', '连载', '第', '更新到'];

      // 如果包含连载关键词，则为连载中
      if (ongoingKeywords.some(keyword => remarks.includes(keyword))) {
        return 'ongoing';
      }

      // 如果包含完结关键词，则为已完结
      if (completedKeywords.some(keyword => remarks.includes(keyword))) {
        return 'completed';
      }
    }

    // 方法2：通过 vod_total 和实际集数对比判断
    if (detail.vod_total && detail.vod_total > 0 && detail.episodes && detail.episodes.length > 0) {
      // 如果实际集数 >= 总集数，则为已完结
      if (detail.episodes.length >= detail.vod_total) {
        return 'completed';
      }
      // 如果实际集数 < 总集数，则为连载中
      return 'ongoing';
    }

    // 无法判断，返回 unknown
    return 'unknown';
  };

  // 获取当前源的视频信息（分辨率和码率）
  const fetchCurrentSourceVideoInfo = async () => {
    if (!detail || !detail.episodes || detail.episodes.length === 0) {
      return;
    }

    // 获取当前集数的播放地址
    let episodeUrl = detail.episodes[currentEpisodeIndex];
    if (!episodeUrl) {
      return;
    }

    // openlist 的 lazy 播放地址或已确认的单文件直链（如 mkv），解析前无法探测分辨率（内部 hls.js XHR 还会触发 CORS 误报），跳过


    // 简单的正则或者后缀判断，如果明确不是 m3u8 (比如 mp4)，则不走 m3u8 代理
    const isM3u8 = episodeUrl.toLowerCase().includes('.m3u') || !episodeUrl.toLowerCase().match(/\.(mp4|flv|webm|mkv|avi|mov)(\?.*)?$/);

    if (currentSource === 'directplay' && isM3u8) {
      // 仅当 localStorage 记忆了该域名需要代理时才走代理
      {
        // 直链模式且未走代理：跳过 HLS.js 探测。
        // getVideoResolutionFromM3u8 内部使用 HLS.js (XMLHttpRequest) 加载，
        // 而 XHR 受 CORS 限制，探测必然失败。实际播放器通过 <video src> 加载不受 CORS 影响。
        console.log('[视频信息] 直链直连模式，跳过分辨率探测（避免 CORS 误报）');
        setCurrentSourceVideoInfo(null);
        return;
      }
    } else if (sourceProxyMode && isM3u8) {
      episodeUrl = `/api/proxy/vod/m3u8?url=${encodeURIComponent(episodeUrl)}&source=${encodeURIComponent(currentSource)}`;
    }

    try {
      const info = await getVideoResolutionFromM3u8(episodeUrl, 4000);
      setCurrentSourceVideoInfo(info);
    } catch (error) {
      console.error('获取视频信息失败:', error);
      setCurrentSourceVideoInfo(null);
    }
  };

  // 播放源优选函数
  const preferBestSource = async (
    sources: SearchResult[]
  ): Promise<SearchResult> => {
    if (sources.length === 1) return sources[0];

    type SourceTestResult = {
      source: SearchResult;
      testResult: { quality: string; loadSpeed: string; pingTime: number; bitrate: string };
    };
    type MaybeSourceTestResult = SourceTestResult | null;

    const sortedByWeight = [...sources].sort((a, b) => {
      const weightA = a.weight ?? 0;
      const weightB = b.weight ?? 0;
      return weightB - weightA;
    });

    const finalizeSelection = (
      completedResults: MaybeSourceTestResult[]
    ): SearchResult => {
      const newVideoInfoMap = new Map<
        string,
        {
          quality: string;
          loadSpeed: string;
          pingTime: number;
          bitrate: string;
        }
      >();
      completedResults.forEach((result) => {
        if (!result) return;
        const sourceKey = `${result.source.source}-${result.source.id}`;
        newVideoInfoMap.set(sourceKey, result.testResult);
      });
      setPrecomputedVideoInfo(newVideoInfoMap);

      const successfulResults = completedResults.filter(
        Boolean
      ) as SourceTestResult[];

      if (successfulResults.length === 0) {
        console.warn('所有播放源测速都失败，按权重排序');
        return sortedByWeight[0];
      }

      const validSpeeds = successfulResults
        .map((result) => {
          const speedStr = result.testResult.loadSpeed;
          if (speedStr === '未知' || speedStr === '测量中...') return 0;

          const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
          if (!match) return 0;

          const value = parseFloat(match[1]);
          const unit = match[2];
          return unit === 'MB/s' ? value * 1024 : value;
        })
        .filter((speed) => speed > 0);

      const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 1024;

      const validPings = successfulResults
        .map((result) => result.testResult.pingTime)
        .filter((ping) => ping > 0);

      const minPing = validPings.length > 0 ? Math.min(...validPings) : 50;
      const maxPing = validPings.length > 0 ? Math.max(...validPings) : 1000;

      const resultsWithScore = successfulResults.map((result) => ({
        ...result,
        score: calculateSourceScore(
          result.testResult,
          maxSpeed,
          minPing,
          maxPing,
          result.source.weight ?? 0
        ),
      }));

      resultsWithScore.sort((a, b) => b.score - a.score);

      console.log('播放源评分排序结果:');
      resultsWithScore.forEach((result, index) => {
        console.log(
          `${index + 1}. ${result.source.source_name
          } - 评分: ${result.score.toFixed(2)} (${result.testResult.quality}, ${result.testResult.loadSpeed
          }, ${result.testResult.pingTime}ms)`
        );
      });

      return resultsWithScore[0].source;
    };

    const testSingleSource = async (
      source: SearchResult
    ): Promise<MaybeSourceTestResult> => {
      try {
        if (!source.episodes || source.episodes.length === 0) {
          console.warn(`播放源 ${source.source_name} 没有可用的播放地址`);
          return null;
        }

        let episodeUrl =
          source.episodes.length > 1
            ? source.episodes[1]
            : source.episodes[0];

        const isM3u8 = episodeUrl.toLowerCase().includes('.m3u') || !episodeUrl.toLowerCase().match(/\.(mp4|flv|webm|mkv|avi|mov)(\?.*)?$/);
        if (source.proxyMode && isM3u8) {
          episodeUrl = `/api/proxy/vod/m3u8?url=${encodeURIComponent(episodeUrl)}&source=${encodeURIComponent(source.source)}`;
        }

        const testResult = await getVideoResolutionFromM3u8(episodeUrl);

        return {
          source,
          testResult,
        };
      } catch (error) {
        return null;
      }
    };

    const maxConcurrency = Math.ceil(sources.length / 2);

    const runAllWithSameConcurrency = async (): Promise<MaybeSourceTestResult[]> => {
      const results: MaybeSourceTestResult[] = new Array(sources.length);
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < sources.length) {
          const currentIndex = nextIndex++;
          results[currentIndex] = await testSingleSource(sources[currentIndex]);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(maxConcurrency, sources.length) }, () =>
          worker()
        )
      );

      return results;
    };

    if (preferStrategy === 'full' || sortedByWeight.length < 5) {
      const allResults = await runAllWithSameConcurrency();
      return finalizeSelection(allResults);
    }

    const topPriorityKeys = new Set(
      sortedByWeight
        .slice(0, 5)
        .map((source) => `${source.source}-${source.id}`)
    );

    const quickResults = await new Promise<MaybeSourceTestResult[]>((resolve) => {
      const results: Array<MaybeSourceTestResult | undefined> = new Array(sources.length);
      let nextIndex = 0;
      let activeCount = 0;
      let completedCount = 0;
      let topCompletedCount = 0;
      let topSuccessCount = 0;
      let settled = false;

      const maybeResolve = () => {
        if (settled) return;

        if (topCompletedCount === 5 && topSuccessCount > 0) {
          settled = true;
          resolve(
            results.filter((result) => result !== undefined) as MaybeSourceTestResult[]
          );
          return;
        }

        if (completedCount === sources.length) {
          settled = true;
          resolve(results as MaybeSourceTestResult[]);
          return;
        }

        while (!settled && activeCount < maxConcurrency && nextIndex < sources.length) {
          const currentIndex = nextIndex++;
          const currentSource = sources[currentIndex];
          const sourceKey = `${currentSource.source}-${currentSource.id}`;
          activeCount += 1;

          testSingleSource(currentSource)
            .then((result) => {
              results[currentIndex] = result;
              completedCount += 1;

              if (topPriorityKeys.has(sourceKey)) {
                topCompletedCount += 1;
                if (result) {
                  topSuccessCount += 1;
                }
              }
            })
            .finally(() => {
              activeCount -= 1;
              maybeResolve();
            });
        }
      };

      maybeResolve();
    });

    return finalizeSelection(quickResults);
  };

  // 计算播放源综合评分
  const calculateSourceScore = (
    testResult: {
      quality: string;
      loadSpeed: string;
      pingTime: number;
    },
    maxSpeed: number,
    minPing: number,
    maxPing: number,
    weight = 0
  ): number => {
    let score = 0;

    // 根据优选偏好确定各维度权重（三项相加恒为 1，保证基础分维持 0-100 量级，
    // 权重加分的相对影响在不同偏好下保持一致）
    const dimensionWeights = (() => {
      switch (preferMode) {
        case 'resolution': // 分辨率优先
          return { quality: 0.6, speed: 0.25, ping: 0.15 };
        case 'speed': // 网速优先（下载速度 + 延迟）
          return { quality: 0.15, speed: 0.55, ping: 0.3 };
        default: // balanced 综合判定（当前模式）
          return { quality: 0.4, speed: 0.4, ping: 0.2 };
      }
    })();

    // 分辨率评分
    const qualityScore = (() => {
      switch (testResult.quality) {
        case '4K':
          return 100;
        case '2K':
          return 85;
        case '1080p':
          return 75;
        case '720p':
          return 60;
        case '480p':
          return 40;
        case 'SD':
          return 20;
        default:
          return 0;
      }
    })();
    score += qualityScore * dimensionWeights.quality;

    // 下载速度评分 - 基于最大速度线性映射
    const speedScore = (() => {
      const speedStr = testResult.loadSpeed;
      if (speedStr === '未知' || speedStr === '测量中...') return 30;

      // 解析速度值
      const match = speedStr.match(/^([\d.]+)\s*(KB\/s|MB\/s)$/);
      if (!match) return 30;

      const value = parseFloat(match[1]);
      const unit = match[2];
      const speedKBps = unit === 'MB/s' ? value * 1024 : value;

      // 基于最大速度线性映射，最高100分
      const speedRatio = speedKBps / maxSpeed;
      return Math.min(100, Math.max(0, speedRatio * 100));
    })();
    score += speedScore * dimensionWeights.speed;

    // 网络延迟评分 - 基于延迟范围线性映射
    const pingScore = (() => {
      const ping = testResult.pingTime;
      if (ping <= 0) return 0; // 无效延迟给默认分

      // 如果所有延迟都相同，给满分
      if (maxPing === minPing) return 100;

      // 线性映射：最低延迟=100分，最高延迟=0分
      const pingRatio = (maxPing - ping) / (maxPing - minPing);
      return Math.min(100, Math.max(0, pingRatio * 100));
    })();
    score += pingScore * dimensionWeights.ping;

    // 权重加分 - 直接加到总分上（0-100分）
    score += weight;

    return Math.round(score * 100) / 100; // 保留两位小数
  };

  const cleanupLocalPlaybackBlobUrls = () => {
    if (typeof window === 'undefined') return;
    const urls = (window as any).__localFileBlobUrls;
    if (Array.isArray(urls)) {
      urls.forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    (window as any).__localFileBlobUrls = [];
  };

  // 检查是否有本地下载的视频


  /**
   * 检查 File System API 本地下载
   */


  /**
   * 判断当前是否应启用 14 分钟链接续期
   * xiaoya：始终启用；openlist：PathMeta.refresh14m 为 true
   */


  /**
   * 是否像 HLS/m3u8 播放地址（xiaoya 仍只在此场景启 14 分钟定时器）
   */


  /**
   * 是否应在拿到真实地址后启动 14 分钟定时器
   * - xiaoya：保持原逻辑，仅 m3u8 启
   * - openlist：PathMeta.refresh14m 开启即可（签名 URL 常无扩展名）
   */


  /**
   * 获取当前播放用的 video / hls 实例（定时器不依赖创建时闭包）
   */
  const getPlaybackMedia = (preferredHls?: any, preferredVideo?: HTMLVideoElement) => {
    const video =
      preferredVideo ||
      (artPlayerRef.current?.video as HTMLVideoElement | undefined) ||
      null;
    const hls = preferredHls || (video as any)?.hls || null;
    return { video, hls };
  };

  /**
   * 刷新成功后的统一收尾：提示、重置重试、重启定时器
   */


  /**
   * 刷新 xiaoya / openlist 链接（静默刷新，尽量不打断播放）
   * - HLS：用 hls.loadSource 换源
   * - 直链（mp4 等）：直接改 video.src
   * hls / video 可选；定时器触发时会从 artPlayer 重新取
   */


  /**
   * 启动14分钟定时刷新器
   * xiaoya：始终启用；openlist：仅当 detail.refresh14m 为 true
   * 不依赖 hls 是否已就绪；到期时再取当前播放器实例
   */


  /**
   * 清除刷新定时器
   */


  // 更新视频地址
  const updateVideoUrl = async (detailData: SearchResult | null, episodeIndex: number) => {
  const requestSeq = ++videoUrlRequestSeqRef.current;
  if (!detailData || episodeIndex >= detailData.episodes.length) { setVideoUrl(''); return; }
  let newUrl = detailData.episodes[episodeIndex] || '';
  setVideoQualities([]);
  if (newUrl.startsWith('/api/source-script/play')) {
    try {
      const response = await fetch(newUrl + (newUrl.includes('?') ? '&' : '?') + 'format=json');
      const data = await response.json();
      if (requestSeq !== videoUrlRequestSeqRef.current) return;
      if (!response.ok || !data.url) throw new Error(data.error || '获取脚本源播放地址失败');
      newUrl = data.url;
      setVideoQualities(data.qualities || []);
    } catch (error) { if (requestSeq === videoUrlRequestSeqRef.current) setVideoError((error as Error).message); return; }
  }
  const hls = newUrl.toLowerCase().includes('.m3u') || !/\.(mp4|flv|webm|mkv|avi|mov)(\?.*)?$/i.test(newUrl);
  if (detailData.proxyMode && newUrl && hls) newUrl = '/api/proxy/vod/m3u8?url=' + encodeURIComponent(newUrl) + '&source=' + encodeURIComponent(detailData.source);
  if (requestSeq !== videoUrlRequestSeqRef.current) return;
  mediaCorsFallbackRef.current = false;
  setVideoUrl(newUrl);
};

  // 处理下载指定集数（支持批量下载）


  const ensureVideoSource = (video: HTMLVideoElement | null, url: string) => {
    if (!video || !url) return;
    const sources = Array.from(video.getElementsByTagName('source'));
    const isHlsJsActive = !!(video as any).hls;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSWebKit =
      /iPad|iPhone|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) &&
        typeof navigator !== 'undefined' &&
        navigator.maxTouchPoints > 1);
    const isSafari =
      isIOSWebKit ||
      (/Safari/i.test(userAgent) &&
        !/Chrome|Chromium|Edg|OPR|Android/i.test(userAgent));
    const isHlsLikeSource =
      videoMediaTypeRef.current !== 'file' &&
      (/\.m3u8?($|\?)/i.test(url) ||
        url.includes('/api/proxy-m3u8') ||
        url.includes('/api/proxy/vod/m3u8'));

    if (isSafari && isHlsJsActive && isHlsLikeSource) {
      // HLS 由 hls.js 接管时，不能再给 <video> 塞原始 m3u8 source，
      // 否则 Safari 可能切回原生 HLS，和 MSE/hls.js 抢同一个播放器。
      sources.forEach((s) => s.remove());
    } else {
      const existedSource = sources.find((s) => s.src === url);
      if (existedSource) {
        if (isHlsLikeSource) {
          existedSource.type = 'application/vnd.apple.mpegurl';
        }
      } else {
        // 移除旧的 source，保持唯一
        sources.forEach((s) => s.remove());
        const sourceEl = document.createElement('source');
        sourceEl.src = url;
        if (isHlsLikeSource) {
          sourceEl.type = 'application/vnd.apple.mpegurl';
        }
        video.appendChild(sourceEl);
      }
    }

    // 始终允许远程播放（AirPlay / Cast）
    video.disableRemotePlayback = false;
    // 如果曾经有禁用属性，移除之
    if (video.hasAttribute('disableRemotePlayback')) {
      video.removeAttribute('disableRemotePlayback');
    }

    // 确保 playsinline 属性存在（iOS 兼容性）
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    // 使用 property 方式也设置一次，确保兼容性
    (video as any).playsInline = true;
    (video as any).webkitPlaysInline = true;

    // openlist/emby/xiaoya/netdisk：CORS 模式加载，需配套「moontvplus 扩展」注入 ACAO 后 Anime4K 才能读帧
    video.crossOrigin = null;
  };

  const prepareHarmonyHlsReinit = () => {
    const player = artPlayerRef.current;
    if (player) {
      const currentTime = Number(player.currentTime) || 0;
      resumeTimeRef.current = currentTime > 0 ? currentTime : null;
      resumePlayingAfterHlsModeSwitchRef.current = !player.paused;
    }

    setVideoError(null);
    setCorsFailedUrl(null);
    setVideoLoadingStage('sourceChanging');
    setIsVideoLoading(true);
    setPlayerReady(false);
  };

  const buildNativeHlsPlaybackUrl = (url: string) => {
    if (!url || typeof window === 'undefined') return url;

    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const parsedUrl = new URL(url, window.location.origin);

      // 已经走服务端去广告代理时，只切换过滤参数，避免重复嵌套代理。
      if (parsedUrl.pathname === '/api/proxy-m3u8') {
        if (nativeHlsAdBlockEnabled) {
          parsedUrl.searchParams.delete('adblock');
        } else {
          parsedUrl.searchParams.set('adblock', 'false');
        }
        return isAbsoluteUrl
          ? parsedUrl.toString()
          : `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }

      if (!nativeHlsAdBlockEnabled) return url;

      let originalUrl = url;
      let proxySegments = false;

      // 保留视频源原有的全量代理能力，同时改由 proxy-m3u8 执行去广告。
      if (parsedUrl.pathname === '/api/proxy/vod/m3u8') {
        originalUrl = parsedUrl.searchParams.get('url') || '';
        proxySegments = true;
      } else if (parsedUrl.pathname === '/api/proxy/m3u8') {
        originalUrl = parsedUrl.searchParams.get('url') || '';
      }

      if (!/^https?:\/\//i.test(originalUrl)) return url;

      const params = new URLSearchParams({
        url: originalUrl,
        source: currentSourceRef.current,
      });

      if (proxySegments) params.set('proxySegments', 'true');
      return `/api/proxy-m3u8?${params.toString()}`;
    } catch (error) {
      console.warn('[Harmony HLS] 构建原生去广告地址失败:', error);
      return url;
    }
  };

  const switchHarmonyHlsPlaybackMode = (mode: HarmonyHlsPlaybackMode) => {
    if (mode === harmonyHlsPlaybackMode) return;

    prepareHarmonyHlsReinit();

    try {
      localStorage.setItem(HARMONY_HLS_PLAYBACK_MODE_KEY, mode);
    } catch { // No recovery is needed here.
 }
    setHarmonyHlsPlaybackMode(mode);
  };



  const toggleToolbarAdBlock = () => {
    if (
      isHarmonyOS &&
      harmonyHlsPlaybackMode === 'native' &&
      isHlsPlaybackUrl(videoUrl)
    ) {
      prepareHarmonyHlsReinit();
    }
    setExternalPlayerAdBlock(!externalPlayerAdBlock);
  };

  // Wake Lock 相关函数
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          'screen'
        );
        console.log('Wake Lock 已启用');
      }
    } catch (err) {
      console.warn('Wake Lock 请求失败:', err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock 已释放');
      }
    } catch (err) {
      console.warn('Wake Lock 释放失败:', err);
    }
  };

  // 清理播放器资源的统一函数
  const cleanupPlayer = async () => {

    // 位图字幕渲染器可能独立于 customSubtitle 存在（源字幕切换路径），兜底销毁


    // 清除刷新定时器


    // 先清理Anime4K，避免GPU纹理错误
    await cleanupAnime4K();

    if (artPlayerRef.current) {
      try {
        // 在销毁前先移除弹幕显示/隐藏事件监听器，避免 destroy 时触发 hide 事件导致状态被错误保存
        if (artPlayerRef.current) {
          artPlayerRef.current.off('artplayerPluginDanmuku:show');
          artPlayerRef.current.off('artplayerPluginDanmuku:hide');
        }

        // 在销毁前从弹幕插件读取最新配置并保存


        // 网页全屏时 Artplayer 会把 $player 挂到 document.body（FULLSCREEN_WEB_IN_BODY 默认开启），
        // 而 destroy 只清空 $container，残留的 $player 会以 z-index:9999 盖住新播放器，
        // 造成 WebKit（iOS/iPad）换集重建后黑屏只有声音。先退出网页全屏移回容器再销毁。
        restoreWebFullscreenOnReadyRef.current = !!artPlayerRef.current.fullscreenWeb;
        if (restoreWebFullscreenOnReadyRef.current) {
          try {
            artPlayerRef.current.fullscreenWeb = false;
          } catch (err) {
            console.warn('销毁前退出网页全屏失败:', err);
            restoreWebFullscreenOnReadyRef.current = false;
          }
        }

        // 销毁 HLS 实例
        if (artPlayerRef.current.video && artPlayerRef.current.video.hls) {
          artPlayerRef.current.video.hls.destroy();
        }

        // 销毁 ArtPlayer 实例
        artPlayerRef.current.destroy();
        artPlayerRef.current = null;

        // 清空 DOM 容器，确保没有残留元素
        if (artRef.current) {
          artRef.current.innerHTML = '';
        }

        console.log('播放器资源已清理');
      } catch (err) {
        console.warn('清理播放器资源时出错:', err);
        artPlayerRef.current = null;
        // 即使出错也要清空容器
        if (artRef.current) {
          artRef.current.innerHTML = '';
        }
      }
    }

    // 兜底清理：移除残留到 body 的网页全屏播放器元素，避免盖住新播放器（黑屏只有声音）。
    // 此时旧实例已销毁、新实例尚未创建，body 直接子级里的 .art-fullscreen-web 必为遗留元素。
    if (typeof document !== 'undefined') {
      document
        .querySelectorAll<HTMLDivElement>('body > .art-fullscreen-web')
        .forEach((el) => el.remove());
    }
  };

  // 初始化Anime4K超分
  const initAnime4K = async () => {
    if (!artPlayerRef.current?.video) return;

    let outputCanvas: HTMLCanvasElement | null = null; // 在外层声明，以便错误处理中清理

    try {
      if (anime4kRef.current) {
        anime4kRef.current.controller?.stop?.();
        anime4kRef.current = null;
        // 等待旧实例完全停止，避免双重渲染
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const video = artPlayerRef.current.video as HTMLVideoElement;

      // 等待视频元数据加载完成
      if (!video.videoWidth || !video.videoHeight) {
        console.warn('视频尺寸未就绪，等待loadedmetadata事件');
        await new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          video.addEventListener('loadedmetadata', handler);
          // 如果已经加载过了，立即resolve
          if (video.videoWidth && video.videoHeight) {
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          }
        });
      }

      // 再次检查视频尺寸
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('无法获取视频尺寸');
      }

      // 使用用户选择的超分倍数
      const scale = anime4kScaleRef.current;

      // 创建输出canvas（显示给用户的）
      outputCanvas = document.createElement('canvas');
      const container = artPlayerRef.current.template.$video.parentElement;

      outputCanvas.width = Math.floor(video.videoWidth * scale); // 确保是整数
      outputCanvas.height = Math.floor(video.videoHeight * scale);

      // 验证outputCanvas尺寸
      console.log('输出Canvas尺寸:', outputCanvas.width, 'x', outputCanvas.height);
      if (!outputCanvas.width || !outputCanvas.height ||
        !isFinite(outputCanvas.width) || !isFinite(outputCanvas.height)) {
        throw new Error(`outputCanvas尺寸无效: ${outputCanvas.width}x${outputCanvas.height}, scale: ${scale}`);
      }

      outputCanvas.style.position = 'absolute';
      outputCanvas.style.top = '0';
      outputCanvas.style.left = '0';
      outputCanvas.style.width = '100%';
      outputCanvas.style.height = '100%';
      outputCanvas.style.objectFit = 'contain';
      outputCanvas.style.cursor = 'pointer';
      outputCanvas.style.zIndex = '1';
      // 确保canvas背景透明，避免Firefox中的渲染问题
      outputCanvas.style.backgroundColor = 'transparent';

      outputCanvas.addEventListener('click', () => {
        if (artPlayerRef.current) {
          artPlayerRef.current.toggle();
        }
      });
      outputCanvas.addEventListener('dblclick', () => {
        if (artPlayerRef.current) {
          artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
        }
      });

      // 隐藏原始video元素（使用opacity而不是display:none以保持视频解码）
      // Firefox在display:none时可能会停止视频解码，导致黑屏
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.position = 'absolute';
      video.style.zIndex = '-1';

      // 插入outputCanvas到容器
      container.insertBefore(outputCanvas, video);

      // 动态导入 anime4k-webgpu 及对应的模式
      const { ModeA, ModeB, ModeC, ModeAA, ModeBB, ModeCA } = await import('anime4k-webgpu');

      let ModeClass: any;
      const modeName = anime4kModeRef.current;

      switch (modeName) {
        case 'ModeA':
          ModeClass = ModeA;
          break;
        case 'ModeB':
          ModeClass = ModeB;
          break;
        case 'ModeC':
          ModeClass = ModeC;
          break;
        case 'ModeAA':
          ModeClass = ModeAA;
          break;
        case 'ModeBB':
          ModeClass = ModeBB;
          break;
        case 'ModeCA':
          ModeClass = ModeCA;
          break;
        default:
          ModeClass = ModeA;
      }

      // 使用自管理的 WebGPU 渲染器。内部自动处理各浏览器的帧源差异：
      // 直接从 <video> 拷贝（Chrome/Edge），或退回 createImageBitmap 中转（Firefox）。
      console.log('开始初始化Anime4K渲染器...');
      console.log('视频尺寸:', video.videoWidth, 'x', video.videoHeight);
      console.log('输出Canvas尺寸:', outputCanvas.width, 'x', outputCanvas.height);

      const controller = await createAnime4KRenderer({
        video,
        canvas: outputCanvas,
        scale,
        pipelineClass: ModeClass,
      });
      console.log('Anime4K渲染器初始化成功');

      anime4kRef.current = {
        controller,
        canvas: outputCanvas,
      };
      syncAnime4KCanvasFlip();

      console.log('Anime4K超分已启用，模式:', anime4kModeRef.current, '倍数:', scale);
      if (artPlayerRef.current) {
        artPlayerRef.current.notice.show = `超分已启用 (${anime4kModeRef.current}, ${scale}x)`;
      }
    } catch (err) {
      console.error('初始化Anime4K失败:', err);
      if (artPlayerRef.current) {
        artPlayerRef.current.notice.show = '超分启用失败：' + (err instanceof Error ? err.message : '未知错误');
      }

      // 移除outputCanvas（如果已创建）
      if (outputCanvas && outputCanvas.parentNode) {
        outputCanvas.parentNode.removeChild(outputCanvas);
      }

      // 恢复video显示
      if (artPlayerRef.current?.video) {
        artPlayerRef.current.video.style.opacity = '1';
        artPlayerRef.current.video.style.pointerEvents = 'auto';
        artPlayerRef.current.video.style.position = '';
        artPlayerRef.current.video.style.zIndex = '';
      }
    }
  };

  // 清理Anime4K
  const cleanupAnime4K = async () => {
    if (anime4kRef.current) {
      try {
        // 停止渲染循环并释放 WebGPU 资源
        anime4kRef.current.controller?.stop?.();

        // 移除canvas
        if (anime4kRef.current.canvas && anime4kRef.current.canvas.parentNode) {
          anime4kRef.current.canvas.parentNode.removeChild(anime4kRef.current.canvas);
        }

        anime4kRef.current = null;

        // 恢复原始video显示
        if (artPlayerRef.current?.video) {
          artPlayerRef.current.video.style.opacity = '1';
          artPlayerRef.current.video.style.pointerEvents = 'auto';
          artPlayerRef.current.video.style.position = '';
          artPlayerRef.current.video.style.zIndex = '';
        }

        console.log('Anime4K已清理');
      } catch (err) {
        console.warn('清理Anime4K时出错:', err);
      }
    }
  };

  // 切换Anime4K状态
  const toggleAnime4K = async (enabled: boolean) => {
    try {
      if (enabled) {
        await initAnime4K();
      } else {
        await cleanupAnime4K();
      }
      setAnime4kEnabled(enabled);
      localStorage.setItem('enable_anime4k', String(enabled));
    } catch (err) {
      console.error('切换超分状态失败:', err);
    }
  };

  // 更改Anime4K模式
  const changeAnime4KMode = async (mode: string) => {
    try {
      setAnime4kMode(mode);


      if (anime4kEnabledRef.current) {
        await cleanupAnime4K();
        await initAnime4K();
      }
    } catch (err) {
      console.error('更改超分模式失败:', err);
    }
  };

  // 更改Anime4K分辨率倍数
  const changeAnime4KScale = async (scale: number) => {
    try {
      setAnime4kScale(scale);


      if (anime4kEnabledRef.current) {
        await cleanupAnime4K();
        await initAnime4K();
      }
    } catch (err) {
      console.error('更改超分倍数失败:', err);
    }
  };

  function filterAdsFromM3U8(type: string, m3u8Content: string): string {
    // 尝试使用缓存的自定义去广告代码
    if (customAdFilterCodeRef.current && customAdFilterCodeRef.current.trim()) {
      try {
        // 移除 TypeScript 类型注解，转换为纯 JavaScript
        const jsCode = customAdFilterCodeRef.current
          // 移除函数参数的类型注解：name: type
          .replace(/(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*([,)])/g, '$1$3')
          // 移除函数返回值类型注解：): type {
          .replace(/\)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*\{/g, ') {')
          // 移除变量声明的类型注解：const name: type =
          .replace(/(const|let|var)\s+(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*=/g, '$1 $2 =');

        // 创建并执行自定义函数
        const customFunction = new Function('type', 'm3u8Content',
          jsCode + '\nreturn filterAdsFromM3U8(type, m3u8Content);'
        );
        return customFunction(type, m3u8Content);
      } catch (err) {
        console.error('执行自定义去广告代码失败，使用默认规则:', err);
        // 如果自定义代码执行失败，继续使用默认规则
      }
    }

    // 默认去广告规则
    if (!m3u8Content) return '';

    // 广告关键字列表
    const adKeywords = [
      'sponsor',
      '/ad/',
      '/ads/',
      'advert',
      'advertisement',
      '/adjump',
      'redtraffic'
    ];

    // 按行分割M3U8内容
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 跳过 #EXT-X-DISCONTINUITY 标识
      if (line.includes('#EXT-X-DISCONTINUITY')) {
        i++;
        continue;
      }

      // 如果是 EXTINF 行，检查下一行 URL 是否包含广告关键字
      if (line.includes('#EXTINF:')) {
        // 检查下一行 URL 是否包含广告关键字
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const containsAdKeyword = adKeywords.some(keyword =>
            nextLine.toLowerCase().includes(keyword.toLowerCase())
          );

          if (containsAdKeyword) {
            // 跳过 EXTINF 行和 URL 行
            i += 2;
            continue;
          }
        }
      }

      // 保留当前行
      filteredLines.push(line);
      i++;
    }

    return filteredLines.join('\n');
  }

  // 跳过片头片尾配置相关函数
  const handleSkipConfigChange = async (newConfig: {
    enable: boolean;
    intro_time: number;
    outro_time: number;
  }) => {
    if (!currentSourceRef.current || !currentIdRef.current) return;

    try {
      setSkipConfig(newConfig);
      if (!newConfig.enable && !newConfig.intro_time && !newConfig.outro_time) {
        await deleteSkipConfig(currentSourceRef.current, currentIdRef.current);

        // 安全地更新播放器设置，仅在播放器存在时执行
        if (artPlayerRef.current && artPlayerRef.current.setting) {
          try {
            artPlayerRef.current.setting.update({
              name: '跳过片头片尾',
              html: '跳过片头片尾',
              switch: skipConfigRef.current.enable,
              onSwitch: function (item: any) {
                const newConfig = {
                  ...skipConfigRef.current,
                  enable: !item.switch,
                };
                handleSkipConfigChange(newConfig);
                return !item.switch;
              },
            });
            artPlayerRef.current.setting.update({
              name: '跳过配置',
              html: '跳过配置',
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
              tooltip:
                skipConfigRef.current.intro_time === 0 && skipConfigRef.current.outro_time === 0
                  ? '设置跳过配置'
                  : `片头: ${formatTime(skipConfigRef.current.intro_time)} | 片尾: ${formatTime(Math.abs(skipConfigRef.current.outro_time))}`,
            });
          } catch (settingErr) {
            console.warn('更新播放器设置失败:', settingErr);
          }
        }
      } else {
        await saveSkipConfig(
          currentSourceRef.current,
          currentIdRef.current,
          newConfig
        );
      }
      console.log('跳过片头片尾配置已保存:', newConfig);
    } catch (err) {
      console.error('保存跳过片头片尾配置失败:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (hours === 0) {
      // 不到一小时，格式为 00:00
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      // 超过一小时，格式为 00:00:00
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // 创建自定义 HLS loader 的工厂函数
  const createCustomHlsLoader = (HlsLib: any) => {
    return class CustomHlsJsLoader extends HlsLib.DefaultConfig.loader {
      constructor(config: any) {
        super(config);
        const load = this.load.bind(this);
        this.load = function (context: any, config: any, callbacks: any) {
          // 拦截manifest和level请求
          if (
            (context as any).type === 'manifest' ||
            (context as any).type === 'level'
          ) {
            const onSuccess = callbacks.onSuccess;
            callbacks.onSuccess = function (
              response: any,
              stats: any,
              context: any
            ) {
              // 如果是m3u8文件，处理内容以移除广告分段
              if (response.data && typeof response.data === 'string') {
                // 过滤掉广告段 - 实现更精确的广告过滤逻辑
                response.data = filterAdsFromM3U8(
                  currentSourceRef.current,
                  response.data
                );
              }
              return onSuccess(response, stats, context, null);
            };
          }
          // 执行原始load方法
          load(context, config, callbacks);
        };
      }
    };
  };

  // 当集数索引变化时自动更新视频地址
  useEffect(() => {
    updateVideoUrl(detail, currentEpisodeIndex);
  }, [detail, currentEpisodeIndex]);

  // 进入页面时直接获取全部源信息
  useEffect(() => {
    const fetchSourceDetail = async (
      source: string,
      id: string,
      title: string,
      fileNameParam?: string
    ): Promise<SearchResult[]> => {
      try {
        let url = `/api/source-detail?source=${source}&id=${id}&title=${encodeURIComponent(title)}`;
        // 如果有fileName参数（小雅源），添加到URL
        if (fileNameParam) {
          url += `&fileName=${encodeURIComponent(fileNameParam)}`;
        }
        const detailResponse = await fetch(url);
        if (!detailResponse.ok) {
          throw new Error('获取视频详情失败');
        }
        const detailData = (await detailResponse.json()) as SearchResult;
        const sourcesWithCorrections = applyCorrectionsToSources([detailData]);
        setAvailableSources(sourcesWithCorrections);
        return sourcesWithCorrections;
      } catch (err) {
        console.error('获取视频详情失败:', err);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };

    // 规范化标题用于聚合（去除特殊符号、括号、空格和全角空格）
    const normalizeTitle = (title: string) => {
      return title
        .replace(/[\s\u3000]/g, '') // 去除空格和全角空格
        .replace(/[()（）[\]【】{}「」『』<>《》]/g, '') // 去除各种括号
        .replace(/[^\w\u4e00-\u9fa5]/g, ''); // 去除特殊符号，保留字母、数字、下划线和中文
    };

    // 辅助函数：获取视频类型
    const getType = (item: SearchResult): 'movie' | 'tv' => {
      // 1. Emby 和 OpenList 源：使用 type_name（基于 TMDB，最可靠）
      if (item.source === 'emby' || item.source?.startsWith('emby_') || item.source === 'openlist') {
        return item.type_name === '电影' ? 'movie' : 'tv';
      }

      // 2. API 采集源：综合判断
      const typeName = item.type_name?.toLowerCase() || '';

      // 2.1 明确包含"电影"或"movie"或"片"的，判断为电影
      if (typeName.includes('电影') || typeName.includes('movie') ||
        typeName.endsWith('片') && !typeName.includes('动漫')) {
        return 'movie';
      }

      // 2.2 包含"剧"、"动漫"、"综艺"等关键词的，判断为剧集
      if (typeName.includes('剧') || typeName.includes('动漫') ||
        typeName.includes('综艺') || typeName.includes('anime')) {
        return 'tv';
      }

      // 2.3 检查 episodes_titles：如果包含"第X集"，判断为剧集
      if (item.episodes_titles && item.episodes_titles.length > 0) {
        const firstTitle = item.episodes_titles[0] || '';
        if (/第\d+集|第\d+话|EP?\d+/i.test(firstTitle)) {
          return 'tv';
        }
      }

      // 2.4 兜底：使用 episodes.length（最不可靠）
      return item.episodes.length === 1 ? 'movie' : 'tv';
    };


    const buildFallbackRecommendations = (items: SearchResult[], query: string): PlayFallbackRecommendation[] => {
      const typedItems = searchType ? items.filter((item) => getType(item) === searchType) : items;
      const preliminaryMap = new Map<string, SearchResult[]>();

      typedItems.forEach((item) => {
        const preliminaryKey = `${normalizeTitle(item.title).toLowerCase()}-${getType(item)}`;
        const group = preliminaryMap.get(preliminaryKey) || [];
        group.push(item);
        preliminaryMap.set(preliminaryKey, group);
      });

      const finalRecommendations: PlayFallbackRecommendation[] = [];

      preliminaryMap.forEach((group, preliminaryKey) => {
        const withYear = new Map<string, SearchResult[]>();
        const withoutYear: SearchResult[] = [];

        group.forEach((item) => {
          if (item.year && item.year.trim() !== '' && item.year !== 'unknown' && /^\d{4}$/.test(item.year)) {
            const yearGroup = withYear.get(item.year) || [];
            yearGroup.push(item);
            withYear.set(item.year, yearGroup);
          } else {
            withoutYear.push(item);
          }
        });

        const emitGroup = (groupKey: string, mergedGroup: SearchResult[]) => {
          const sourceNames = Array.from(new Set(mergedGroup.map((item) => item.source_name).filter(Boolean)));
          const episodeCountMap = new Map<number, number>();
          const doubanCountMap = new Map<number, number>();

          mergedGroup.forEach((item) => {
            const episodeCount = item.episodes?.length || 0;
            if (episodeCount > 0) {
              episodeCountMap.set(episodeCount, (episodeCountMap.get(episodeCount) || 0) + 1);
            }
            if (item.douban_id && item.douban_id > 0) {
              doubanCountMap.set(item.douban_id, (doubanCountMap.get(item.douban_id) || 0) + 1);
            }
          });

          let episodes = 0;
          let episodeVotes = 0;
          episodeCountMap.forEach((votes, count) => {
            if (votes > episodeVotes) {
              episodeVotes = votes;
              episodes = count;
            }
          });

          let doubanId: number | undefined;
          let doubanVotes = 0;
          doubanCountMap.forEach((votes, id) => {
            if (votes > doubanVotes) {
              doubanVotes = votes;
              doubanId = id;
            }
          });

          const representative = mergedGroup.slice().sort((a, b) => {
            const aPoster = a.poster ? 1 : 0;
            const bPoster = b.poster ? 1 : 0;
            if (bPoster !== aPoster) return bPoster - aPoster;
            return (b.weight ?? 0) - (a.weight ?? 0);
          })[0];

          finalRecommendations.push({
            key: groupKey,
            item: representative,
            episodes: episodes || undefined,
            sourceNames,
            doubanId,
          });
        };

        if (withYear.size > 0) {
          withYear.forEach((yearGroup, year) => {
            emitGroup(`${preliminaryKey}-${year}`, [...yearGroup, ...withoutYear]);
          });
        } else if (withoutYear.length > 0) {
          emitGroup(`${preliminaryKey}-unknown`, withoutYear);
        }
      });

      const normalizedQuery = normalizeTitle(query).toLowerCase();

      return finalRecommendations
        .sort((a, b) => {
          const aContains = normalizeTitle(a.item.title).toLowerCase().includes(normalizedQuery) ? 1 : 0;
          const bContains = normalizeTitle(b.item.title).toLowerCase().includes(normalizedQuery) ? 1 : 0;
          if (bContains !== aContains) return bContains - aContains;
          if (b.sourceNames.length !== a.sourceNames.length) return b.sourceNames.length - a.sourceNames.length;
          return (b.item.weight ?? 0) - (a.item.weight ?? 0);
        })
        .slice(0, 12);
    };

    const readSearchCache = (query: string): SearchCachePayload | null => {
      if (typeof window === 'undefined' || !query.trim()) {
        return null;
      }

      try {
        const cacheKey = `search_cache_${query.trim()}${''}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as SearchCachePayload;
        if (
          (parsed?.status === 'complete' || parsed?.status === 'partial') &&
          Array.isArray(parsed.results)
        ) {
          return parsed;
        }
      } catch (error) {
        console.error('[Play] 读取缓存失败:', error);
      }
      return null;
    };

    const writeCompleteSearchCache = (query: string, results: SearchResult[]) => {
      if (typeof window === 'undefined' || !query.trim()) return;

      try {
        const cacheKey = `search_cache_${query.trim()}${''}`;
        const payload: SearchCachePayload = {
          status: 'complete',
          results,
          query: query.trim(),
          updatedAt: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (error) {
        console.error('[Play] 写入缓存失败:', error);
      }
    };

    const filterSourcesForCurrentVideo = (items: SearchResult[]): SearchResult[] => {
      return items.filter(
        (result: SearchResult) =>
          normalizeTitle(result.title).toLowerCase() ===
          normalizeTitle(videoTitleRef.current).toLowerCase() &&
          (videoYearRef.current
            ? result.year.toLowerCase() === videoYearRef.current.toLowerCase() ||
              !result.year ||
              result.year.trim() === '' ||
              result.year === 'unknown' ||
              !/^\d{4}$/.test(result.year)
            : true) &&
          (searchType
            ? getType(result) === searchType
            : true)
      );
    };

    const fetchSourcesData = async (query: string): Promise<SearchResult[]> => {
      // 根据搜索词获取全部源信息
      setHasCompletedSearchRequest(false);
      setFallbackRecommendations([]);

      let fallbackCachedResults: SearchResult[] = [];

      try {
        const cachedPayload = readSearchCache(query);
        if (cachedPayload) {
          console.log(`[Play] 使用 sessionStorage ${cachedPayload.status === 'partial' ? '临时' : '完整'}缓存的搜索结果`);
          setFallbackRecommendations(buildFallbackRecommendations(cachedPayload.results, query));

          const cachedResults = filterSourcesForCurrentVideo(cachedPayload.results);
          fallbackCachedResults = cachedResults;
          setAvailableSources(applyCorrectionsToSources(cachedResults));

          if (cachedPayload.status === 'complete') {
            setHasCompletedSearchRequest(true);
            return cachedResults;
          }
        }

        // 没有缓存或只有 partial 缓存时，重新请求完整搜索结果
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (!response.ok) {
          throw new Error('搜索失败');
        }
        const data = await response.json();
        const allResults = (data.results || []) as SearchResult[];

        writeCompleteSearchCache(query, allResults);
        setHasCompletedSearchRequest(true);
        setFallbackRecommendations(buildFallbackRecommendations(allResults, query));

        const results = filterSourcesForCurrentVideo(allResults);
        setAvailableSources(applyCorrectionsToSources(results));
        return results;
      } catch (err) {
        setSourceSearchError(err instanceof Error ? err.message : '搜索失败');
        if (fallbackCachedResults.length > 0) {
          return fallbackCachedResults;
        }
        setAvailableSources([]);
        return [];
      } finally {
        setSourceSearchLoading(false);
      }
    };

    const getCachedSourcesData = (query: string): SearchResult[] => {
      const cachedPayload = readSearchCache(query);
      if (!cachedPayload) {
        return [];
      }

      return applyCorrectionsToSources(
        filterSourcesForCurrentVideo(cachedPayload.results)
      );
    };

    const initAll = async () => {
      if (currentSource === 'directplay') {
        if (!currentId) {
          setError('缺少直链地址');
          setLoading(false);
          return;
        }

        setLoading(true);
        setLoadingStage('fetching');
        setLoadingMessage('🎬 正在准备直链播放...');

        let directUrl = '';
        try {
          directUrl = base58Decode(currentId);
        } catch (decodeError) {
          console.error('直链地址解析失败:', decodeError);
          setError('直链地址解析失败');
          setLoading(false);
          return;
        }

        const directDetail: SearchResult = {
          id: currentId,
          title: '直链播放',
          poster: '',
          episodes: [directUrl],
          episodes_titles: ['直链'],
          source: 'directplay',
          source_name: '直链',
          class: '',
          year: '',
          desc: '',
          type_name: '',
          douban_id: 0,
        };

        setNeedPrefer(false);
        setCurrentSource('directplay');
        setCurrentId(currentId);
        setVideoTitle('直链播放');
        setVideoYear('');
        setVideoCover('');
        setVideoDoubanId(0);
        setCorrectedDesc('');
        setDetail(directDetail);

        setAvailableSources([directDetail]);
        setCurrentEpisodeIndex(0);
        setSourceSearchError(null);
        setSourceSearchLoading(false);
        setBackgroundSourcesLoading(false);

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('source', 'directplay');
        newUrl.searchParams.set('id', currentId);
        newUrl.searchParams.delete('prefer');
        newUrl.searchParams.delete('fileName');
        window.history.replaceState({}, '', newUrl.toString());

        setLoadingStage('ready');
        setLoadingMessage('✨ 准备就绪，即将开始播放...');
        setTimeout(() => {
          setLoading(false);
        }, 500);
        return;
      }

      if (!currentSource && !currentId && !videoTitle && !searchTitle) {
        setError('缺少必要参数');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadingStage(currentSource && currentId ? 'fetching' : 'searching');
      setLoadingMessage(
        currentSource && currentId
          ? '🎬 正在获取视频详情...'
          : '🔍 正在搜索播放源...'
      );

      // 如果已经有了source和id，优先通过单个详情接口快速获取
      let detailData: SearchResult | null = null;
      let sourcesInfo: SearchResult[] = [];

      if (currentSource && currentId) {
        const cachedSources = getCachedSourcesData(searchTitle || videoTitle);
        const cachedTarget = cachedSources.find(
          (source) => source.source === currentSource && source.id === currentId
        );

        if (cachedTarget?.episodes?.length) {
          detailData = cachedTarget;
          sourcesInfo = cachedSources;
          setAvailableSources(cachedSources);
          setSourceSearchLoading(false);
        } else {
          // 先快速获取当前源的详情
          try {
            // currentSource 已经是完整格式（如 'emby_wumei'）
            // 如果是小雅源且有fileName参数，传递给API
            const currentSourceDetail = await fetchSourceDetail(
              currentSource,
              currentId,
              searchTitle || videoTitle,
              currentSource === 'xiaoya' ? fileName : undefined
            );
            if (currentSourceDetail.length > 0) {
              detailData = currentSourceDetail[0];
              sourcesInfo = currentSourceDetail;
            }
          } catch (err) {
            console.error('获取当前源详情失败:', err);
          }
        }

        // 异步获取其他源信息，不阻塞播放
        setBackgroundSourcesLoading(true);
        fetchSourcesData(searchTitle || videoTitle).then((sources) => {
          // 合并当前源和搜索到的其他源
          const allSources = [...sourcesInfo];
          sources.forEach((source) => {
            // 避免重复添加当前源
            if (!(source.source === currentSource && source.id === currentId)) {
              allSources.push(source);
            }
          });
          setAvailableSources(applyCorrectionsToSources(allSources));
          setBackgroundSourcesLoading(false);
        }).catch((err) => {
          console.error('异步获取其他源失败:', err);
          setBackgroundSourcesLoading(false);
        });
      } else {
        // 没有source和id，正常搜索流程
        sourcesInfo = await fetchSourcesData(searchTitle || videoTitle);
      }

      if (!detailData && sourcesInfo.length === 0) {
        setError('未找到匹配结果');
        setLoading(false);
        return;
      }

      if (!detailData) {
        detailData = sourcesInfo[0];
      }
      // 指定源和id且无需优选
      if (currentSource && currentId && !needPreferRef.current) {
        const target = sourcesInfo.find(
          (source) => source.source === currentSource && source.id === currentId
        );
        if (target) {
          detailData = target;

          // 这类源统一通过详情接口补全播放数据

        } else {
          setError('未找到匹配结果');
          setLoading(false);
          return;
        }
      }

      // 未指定源和 id 或需要优选，且开启优选开关
      if (
        (!currentSource || !currentId || needPreferRef.current) &&
        optimizationEnabled
      ) {
        setLoadingStage('preferring');
        setLoadingMessage('⚡ 正在优选最佳播放源...');

        // 过滤掉 openlist、所有 emby 源和 xiaoya 源，它们不参与测速
        const sourcesToTest = sourcesInfo.filter(s => {
          // 检查是否为 openlist
          if (s.source === 'openlist') return false;

          // 检查是否为 emby 源（包括 emby 和 emby_xxx 格式）
          if (s.source === 'emby' || s.source.startsWith('emby_')) return false;

          // 检查是否为 xiaoya 源
          if (s.source === 'xiaoya') return false;

          // 脚本源详情懒加载，不参与测速
          if (s.source.startsWith('script:')) return false;

          return true;
        });

        const excludedSources = sourcesInfo.filter(s =>
          s.source === 'openlist' ||
          s.source === 'emby' ||
          s.source.startsWith('emby_') ||
          s.source === 'xiaoya' ||
          s.source.startsWith('script:')
        );

        if (sourcesToTest.length > 0) {
          detailData = await preferBestSource(sourcesToTest);
        } else if (excludedSources.length > 0) {
          // 如果只有懒加载详情的源，直接使用第一个
          detailData = excludedSources[0];
        } else {
          detailData = sourcesInfo[0];
        }
      }

      console.log(detailData.source, detailData.id);

      // 这类源统一通过详情接口补全播放数据


      setNeedPrefer(false);
      // 直接使用 detailData.source（已经是完整格式）
      setCurrentSource(detailData.source);
      setCurrentId(detailData.id);

      // 如果是小雅源，检查并应用纠错信息


      // 更新所有相关状态（在应用纠错信息之后）
      setVideoYear(detailData.year);
      setVideoTitle(detailData.title || videoTitleRef.current);
      setVideoCover(detailData.poster);
      setVideoDoubanId(detailData.douban_id || 0);

      setDetail(detailData);
       // 从 detail 数据中读取代理模式
      if (currentEpisodeIndex >= detailData.episodes.length) {
        setCurrentEpisodeIndex(0);
      }

      // 规范URL参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', detailData.source);
      newUrl.searchParams.set('id', detailData.id);
      newUrl.searchParams.set('year', detailData.year);
      newUrl.searchParams.set('title', detailData.title);
      newUrl.searchParams.delete('prefer');
      // 只有当元数据不是从文件获取时，才删除fileName参数
      if (detailData.metadataSource !== 'file') {
        newUrl.searchParams.delete('fileName');
      }
      window.history.replaceState({}, '', newUrl.toString());

      setLoadingStage('ready');
      setLoadingMessage('✨ 准备就绪，即将开始播放...');

      // 加载播放记录
      try {
        const detailEpisodeProgressContentKey = buildEpisodeProgressContentKey({
          doubanId: detailData.douban_id,
          tmdbId: detailData.tmdb_id,
          title: initialEpisodeProgressTitle,
          year: initialEpisodeProgressYear,
          searchType,
        });
        const allRecords = await getAllPlayRecords();
        const key = generateStorageKey(detailData.source, detailData.id);
        const record = allRecords[key];

        // 确定初始集数索引
        let initialIndex = 0;
        let shouldResumeTime = false;

        if (record) {
          // 有播放记录
          const recordIndex = record.index - 1;
          const recordTime = record.play_time;

          // 如果有initialEpisodeIndex（用户从文件点击进入）
          if (detailData.initialEpisodeIndex !== undefined) {
            // 如果播放记录的集数和点击的文件集数一致，则使用播放记录的时间
            if (recordIndex === detailData.initialEpisodeIndex) {
              initialIndex = recordIndex;
              shouldResumeTime = true;
              resumeTimeRef.current = recordTime;
              console.log('[Play] 播放记录集数与点击文件一致，恢复播放进度:', recordTime);
            } else {
              // 否则使用点击的文件集数，从头开始播放
              initialIndex = detailData.initialEpisodeIndex;
              const localEpisodeTime = loadLocalEpisodeProgress(
                detailEpisodeProgressContentKey,
                initialIndex
              );
              resumeTimeRef.current = localEpisodeTime;
              console.log('[Play] 使用点击的文件集数:', initialIndex);
            }
          } else {
            // 没有initialEpisodeIndex，使用播放记录
            initialIndex = recordIndex;
            shouldResumeTime = true;
            resumeTimeRef.current = recordTime;
            console.log('[Play] 使用播放记录集数:', initialIndex);
          }
        } else {
          // 没有播放记录
          if (detailData.initialEpisodeIndex !== undefined) {
            // 使用点击的文件集数
            initialIndex = detailData.initialEpisodeIndex;
            resumeTimeRef.current = loadLocalEpisodeProgress(
              detailEpisodeProgressContentKey,
              initialIndex
            );
            console.log('[Play] 没有播放记录，使用点击的文件集数:', initialIndex);
          } else {
            // 默认从第0集开始
            initialIndex = 0;
            resumeTimeRef.current = loadLocalEpisodeProgress(
              detailEpisodeProgressContentKey,
              initialIndex
            );
            console.log('[Play] 没有播放记录，从第0集开始');
          }
        }

        // 更新当前选集索引
        if (initialIndex < detailData.episodes.length && initialIndex >= 0) {
          setCurrentEpisodeIndex(initialIndex);
          currentEpisodeIndexRef.current = initialIndex;
        }
      } catch (err) {
        console.error('读取播放记录失败:', err);
      }

      // 短暂延迟让用户看到完成状态
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };

    initAll();
  }, []);

  // 跳过片头片尾配置处理
  useEffect(() => {
    // 仅在初次挂载时检查跳过片头片尾配置
    const initSkipConfig = async () => {
      if (!currentSource || !currentId) return;

      try {
        const config = await getSkipConfig(currentSource, currentId);
        if (config) {
          setSkipConfig(config);
        }
      } catch (err) {
        console.error('读取跳过片头片尾配置失败:', err);
      }
    };

    initSkipConfig();
  }, []);

  // 监听 URL 参数变化，处理换源和换视频（用于房员跟随房主操作）
  useEffect(() => {
    const urlSource = searchParams.get('source');
    const urlId = searchParams.get('id');

    // 只在URL参数存在且与当前状态不同时才处理
    if (urlSource && urlId && (urlSource !== currentSource || urlId !== currentId)) {
      // 检查新的source和id是否在可用源列表中
      // 如果 availableSources 还是空的，说明数据还在加载中，不做处理
      if (availableSources.length === 0) {
        return;
      }

      const targetSource = availableSources.find(
        (source) => source.source === urlSource && source.id === urlId
      );

      if (targetSource) {
        // 记录当前播放进度
        const currentPlayTime = artPlayerRef.current?.currentTime || 0;

        // 获取URL中的episode参数
        const episodeParam = searchParams.get('episode');
        const targetEpisode = episodeParam ? parseInt(episodeParam, 10) - 1 : 0;

        // 更新视频源信息（urlSource 已经是完整格式）
        setCurrentSource(urlSource);
        setCurrentId(urlId);
        setVideoTitle(targetSource.title);
        setVideoYear(targetSource.year);
        setVideoCover(targetSource.poster);
        setVideoDoubanId(targetSource.douban_id || 0);
        setDetail(targetSource);
         // 从 detail 数据中读取代理模式

        // 更新集数
        if (targetEpisode >= 0 && targetEpisode < targetSource.episodes.length) {
          setCurrentEpisodeIndex(targetEpisode);

          // 如果是同一集,保存播放进度以便恢复
          if (targetEpisode === currentEpisodeIndex && currentPlayTime > 1) {
            resumeTimeRef.current = currentPlayTime;
          } else {
            resumeTimeRef.current = null;
          }
        }
      } else {
        // 如果新源不在可用列表中,强制刷新页面重新加载
        window.location.reload();
      }
    }
  }, [searchParams, currentSource, currentId, availableSources, currentEpisodeIndex]);

  // 监听 detail 和 currentEpisodeIndex 变化，自动获取视频信息
  useEffect(() => {
    if (detail && detail.episodes && detail.episodes.length > 0) {
      fetchCurrentSourceVideoInfo();
    }
  }, [detail, currentEpisodeIndex]);

  // 监听 detail 和 currentEpisodeIndex 变化，动态更新字幕


  const getSourceSwitchResumeTime = async (
    episodeIndex: number,
    currentPlayTime: number
  ): Promise<number | null> => {
    if (currentPlayTime > 1) {
      return currentPlayTime;
    }

    if (!currentSourceRef.current || !currentIdRef.current) {
      return null;
    }

    try {
      const allRecords = await getAllPlayRecords();
      const currentRecord = allRecords[
        generateStorageKey(currentSourceRef.current, currentIdRef.current)
      ];

      if (
        currentRecord &&
        currentRecord.index - 1 === episodeIndex &&
        currentRecord.play_time > 1
      ) {
        return currentRecord.play_time;
      }
    } catch (error) {
      console.warn('[Play] Failed to read source-switch play record:', error);
    }

    return loadLocalEpisodeProgress(
      episodeProgressContentKey,
      episodeIndex
    );
  };

  // 处理换源
  const handleSourceChange = async (
    newSource: string,
    newId: string,
    newTitle: string
  ) => {
    try {
      // 标记正在换源，防止 title 变化触发页面刷新
      isSourceChangingRef.current = true;

      // 显示换源加载状态
      setVideoLoadingStage('sourceChanging');
      setIsVideoLoading(true);
      setVideoError(null);
      setCorsFailedUrl(null);
      proxyAttemptedRef.current = false;

      // 记录当前播放进度（仅在同一集数切换时恢复）
      const currentPlayTime = artPlayerRef.current?.currentTime || 0;
      console.log('换源前当前播放时间:', currentPlayTime);

      // 清除并设置下一个跳过片头片尾配置
      if (currentSourceRef.current && currentIdRef.current) {
        try {
          await deleteSkipConfig(
            currentSourceRef.current,
            currentIdRef.current
          );
          await saveSkipConfig(newSource, newId, skipConfigRef.current);
        } catch (err) {
          console.error('清除跳过片头片尾配置失败:', err);
        }
      }

      const newDetail: SearchResult | undefined = availableSources.find(
        (source) => source.source === newSource && source.id === newId
      );
      if (!newDetail) {
        setError('未找到匹配结果');
        return;
      }

      // 这类源统一通过详情接口补全播放数据


      // 再次确认 newDetail 不为空（类型守卫）
      if (!newDetail) {
        setError('视频详情数据无效');
        return;
      }

      const newEpisodeProgressContentKey = buildEpisodeProgressContentKey({
        doubanId: newDetail.douban_id,
        tmdbId: newDetail.tmdb_id,
        title: initialEpisodeProgressTitle,
        year: initialEpisodeProgressYear,
        searchType,
      });

      // 尝试跳转到当前正在播放的集数
      const previousEpisodeIndex = currentEpisodeIndexRef.current;
      const previousSource = currentSourceRef.current;
      const previousId = currentIdRef.current;
      let targetIndex = previousEpisodeIndex;

      // 如果新源的集数跟旧源的集数不一致，清除当前剧集的所有弹幕缓存
      const oldEpisodeCount = detail?.episodes?.length || 0;
      const newEpisodeCount = newDetail.episodes?.length || 0;
      if (oldEpisodeCount > 0 && newEpisodeCount > 0 && oldEpisodeCount !== newEpisodeCount) {
        const titleForCache = detail?.title || videoTitle;
        console.log(`换源集数不一致 (${oldEpisodeCount} -> ${newEpisodeCount})，清除弹幕缓存: ${titleForCache}`);

      }

      // 如果当前集数超出新源的范围，则跳转到第一集
      if (!newDetail.episodes || targetIndex >= newDetail.episodes.length) {
        targetIndex = 0;
      }

      const isSameEpisodeSwitch = targetIndex === previousEpisodeIndex;
      const resumeTime = isSameEpisodeSwitch
        ? await getSourceSwitchResumeTime(previousEpisodeIndex, currentPlayTime)
        : loadLocalEpisodeProgress(
            newEpisodeProgressContentKey,
            targetIndex
          );
      resumeTimeRef.current = resumeTime;

      // 更新URL参数（不刷新页面）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('source', newSource);
      newUrl.searchParams.set('id', newId);
      newUrl.searchParams.set('year', newDetail.year);
      newUrl.searchParams.set('title', newDetail.title || newTitle);
      window.history.replaceState({}, '', newUrl.toString());

      // 如果是小雅源，检查并应用纠错信息
      const finalTitle = newDetail.title || newTitle;
      const finalCover = newDetail.poster;
      const finalDesc = '';



      setVideoTitle(finalTitle);
      setVideoYear(newDetail.year);
      setVideoCover(finalCover);
      setCorrectedDesc(finalDesc);
      setVideoDoubanId(newDetail.douban_id || 0);

      if (isSameEpisodeSwitch && resumeTime && resumeTime > 1) {
        const currentDuration = artPlayerRef.current?.duration || 0;
        saveLocalEpisodeProgress(
          newEpisodeProgressContentKey,
          targetIndex,
          resumeTime,
          currentDuration
        );

        try {
          const migratedRecord = {
            title: finalTitle,
            source_name: newDetail.source_name || '',
            year: newDetail.year || '',
            cover: finalCover || '',
            index: targetIndex + 1,
            total_episodes: newDetail.episodes?.length || 1,
            play_time: Math.floor(resumeTime),
            total_time: Math.floor(currentDuration),
            save_time: Date.now(),
            search_title: searchTitle,
          };

          if (previousSource && previousId) {
            await migratePlayRecord(
              previousSource,
              previousId,
              newSource,
              newId,
              migratedRecord
            );
          } else {
            await savePlayRecord(newSource, newId, migratedRecord);
          }
        } catch (error) {
          console.warn('[Play] Failed to migrate source-switch play record:', error);
        }
      }

      // newSource 已经是完整格式
      setCurrentSource(newSource);
      setCurrentId(newId);
      setDetail(newDetail);
       // 从 detail 数据中读取代理模式
      setCurrentEpisodeIndex(targetIndex);
    } catch (err) {
      // 隐藏换源加载状态
      setIsVideoLoading(false);
      setError(err instanceof Error ? err.message : '换源失败');
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 集数切换
  // ---------------------------------------------------------------------------
  const saveCurrentEpisodeLocalProgressOnly = () => {
    if (!artPlayerRef.current) {
      return;
    }

    const currentTime = artPlayerRef.current.currentTime || 0;
    const duration = artPlayerRef.current.duration || 0;

    if (currentTime < 1 || !duration) {
      return;
    }

    try {
      saveLocalEpisodeProgress(
        episodeProgressContentKey,
        currentEpisodeIndexRef.current,
        currentTime,
        duration
      );
    } catch (error) {
      console.warn('[Play] Failed to save local episode progress before episode switch:', error);
    }
  };

  const primeEpisodeResumeState = (targetEpisodeIndex: number) => {
    if (!currentSourceRef.current || !currentIdRef.current) {
      resumeTimeRef.current = null;
      return;
    }

    // 切集路径只读取本地单集进度，避免阻塞式读取全局播放记录/远端数据库。
    // 首次进入页面的全局播放记录恢复逻辑保持不变。
    resumeTimeRef.current = loadLocalEpisodeProgress(
      episodeProgressContentKey,
      targetEpisodeIndex
    );
  };

  const prepareEpisodeSwitch = () => {
    if (artPlayerRef.current) {
      lastPlaybackRateRef.current =
        artPlayerRef.current.playbackRate || lastPlaybackRateRef.current;
      lastVolumeRef.current =
        artPlayerRef.current.volume || lastVolumeRef.current;
      playbackRateRestoreWindowUntilRef.current = Date.now() + 8000;

      saveCurrentEpisodeLocalProgressOnly();
    }

    suppressPlayRecordJumpOnNextEpisodeChangeRef.current = true;
    setVideoLoadingStage('episodeChanging');
    setIsVideoLoading(true);
    setVideoError(null);
  };

  // 处理集数切换
  const handleEpisodeChange = async (episodeNumber: number) => {
    if (episodeNumber < 0 || episodeNumber >= totalEpisodes) {
      return;
    }

    if (episodeNumber === currentEpisodeIndexRef.current) {
      return;
    }

    prepareEpisodeSwitch();
    primeEpisodeResumeState(episodeNumber);
    setCurrentEpisodeIndex(episodeNumber);
  };

  const handlePreviousEpisode = async () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;
    if (d && d.episodes && idx > 0) {
      const targetIndex = idx - 1;
      prepareEpisodeSwitch();
      primeEpisodeResumeState(targetIndex);
      setCurrentEpisodeIndex(targetIndex);
    }
  };

  // 检查集数是否被过滤
  const isEpisodeFilteredByTitle = (title: string): boolean => {
    return isEpisodeHiddenByFilter(title, episodeFilterConfigRef.current);
  };

  const handleNextEpisode = async () => {
    const d = detailRef.current;
    const idx = currentEpisodeIndexRef.current;

    if (!d || !d.episodes || idx >= d.episodes.length - 1) {
      return;
    }

    // 查找下一个未被过滤的集数
    let nextIdx = idx + 1;
    while (nextIdx < d.episodes.length) {
      const episodeTitle = d.episodes_titles?.[nextIdx];
      const isFiltered = episodeTitle && isEpisodeFilteredByTitle(episodeTitle);

      if (!isFiltered) {
        prepareEpisodeSwitch();
        primeEpisodeResumeState(nextIdx);
        setCurrentEpisodeIndex(nextIdx);
        return;
      }
      nextIdx++;
    }

    // 所有后续集数都被屏蔽
    if (artPlayerRef.current) {
      artPlayerRef.current.notice.show = '后续集数均已屏蔽';
      artPlayerRef.current.pause();
    }
  };

  // ---------------------------------------------------------------------------
  // 弹幕处理函数
  // ---------------------------------------------------------------------------

  /**
   * 智能过滤弹幕源：优先匹配年份和标题完全相同的源
   * @param animes 所有搜索到的弹幕源
   * @param videoTitle 视频标题
   * @param videoYear 视频年份（如 "2024"）
   * @returns 过滤后的弹幕源列表
   */


  // 匹配弹幕集数：优先根据集数标题中的数字匹配，降级到索引匹配


  // 加载弹幕到播放器


  // 预加载下一集弹幕（完全复制 loadDanmakuForCurrentEpisode 的逻辑）


  // 处理上传弹幕


  // 处理弹幕选择


  // 处理用户选择弹幕源


  // 手动重新选择弹幕源（忽略记忆）- 保留供将来使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars


  // ---------------------------------------------------------------------------
  // 键盘快捷键
  // ---------------------------------------------------------------------------
  // 处理全局快捷键
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // 忽略输入框中的按键事件
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    )
      return;

    // Alt + 左箭头 = 上一集
    if (e.altKey && e.key === 'ArrowLeft') {
      if (detailRef.current && currentEpisodeIndexRef.current > 0) {
        handlePreviousEpisode();
        e.preventDefault();
      }
    }

    // Alt + 右箭头 = 下一集
    if (e.altKey && e.key === 'ArrowRight') {
      const d = detailRef.current;
      const idx = currentEpisodeIndexRef.current;
      if (d && idx < d.episodes.length - 1) {
        handleNextEpisode();
        e.preventDefault();
      }
    }

    // P = 使用当前配置快捷快进
    if (!e.altKey && e.key.toLowerCase() === 'p') {
      if (seekQuickForward()) {
        e.preventDefault();
      }
    }

    // 左箭头 = 快退
    if (!e.altKey && e.key === 'ArrowLeft') {
      if (artPlayerRef.current && artPlayerRef.current.currentTime > 5) {
        artPlayerRef.current.currentTime -= 10;
        e.preventDefault();
      }
    }

    // 右箭头 = 快进
    if (!e.altKey && e.key === 'ArrowRight') {
      if (
        artPlayerRef.current &&
        artPlayerRef.current.currentTime < artPlayerRef.current.duration - 5
      ) {
        artPlayerRef.current.currentTime += 10;
        e.preventDefault();
      }
    }

    // 上箭头 = 音量+
    if (e.key === 'ArrowUp') {
      if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
        artPlayerRef.current.notice.show = `音量: ${Math.round(
          artPlayerRef.current.volume * 100
        )}`;
        e.preventDefault();
      }
    }

    // 下箭头 = 音量-
    if (e.key === 'ArrowDown') {
      if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
        artPlayerRef.current.volume =
          Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
        artPlayerRef.current.notice.show = `音量: ${Math.round(
          artPlayerRef.current.volume * 100
        )}`;
        e.preventDefault();
      }
    }

    // 空格 = 播放/暂停
    if (e.key === ' ') {
      if (artPlayerRef.current) {
        artPlayerRef.current.toggle();
        e.preventDefault();
      }
    }

    // 小键盘 + = 倍速+
    if (e.code === 'NumpadAdd') {
      if (adjustPlaybackRateByStep(1)) {
        e.preventDefault();
      }
    }

    // 小键盘 - = 倍速-
    if (e.code === 'NumpadSubtract') {
      if (adjustPlaybackRateByStep(-1)) {
        e.preventDefault();
      }
    }

    // 小键盘 / = 恢复 1x
    if (e.code === 'NumpadDivide') {
      if (resetPlaybackRate()) {
        e.preventDefault();
      }
    }

    // f 键 = 切换全屏
    if (e.key === 'f' || e.key === 'F') {
      if (artPlayerRef.current) {
        artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
        e.preventDefault();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 播放记录相关
  // ---------------------------------------------------------------------------
  // 保存播放进度
  const saveCurrentPlayProgress = async () => {
    if (
      !artPlayerRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current ||
      !videoTitleRef.current ||
      !detailRef.current?.source_name
    ) {
      return;
    }

    const player = artPlayerRef.current;
    const currentTime = player.currentTime || 0;
    const duration = player.duration || 0;
    const playTime = Math.floor(currentTime);

    // 如果播放时间太短（少于5秒）或者视频时长无效，不保存
    if (currentTime < 1 || !duration) {
      return;
    }

    if (lastSavedPlayTimeRef.current === playTime) {
      return;
    }

    try {
      saveLocalEpisodeProgress(
        episodeProgressContentKey,
        currentEpisodeIndexRef.current,
        currentTime,
        duration
      );

      await savePlayRecord(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        source_name: detailRef.current?.source_name || '',
        year: detailRef.current?.year,
        cover: detailRef.current?.poster || '',
        index: currentEpisodeIndexRef.current + 1, // 转换为1基索引
        total_episodes: detailRef.current?.episodes.length || 1,
        play_time: playTime,
        total_time: Math.floor(duration),
        save_time: Date.now(),
        search_title: searchTitle,
        is_anime: isAnimeCategoryText(
          detailRef.current?.type_name,
          detailRef.current?.class
        ),
      });

      lastSavedPlayTimeRef.current = playTime;
      lastSaveTimeRef.current = Date.now();
      console.log('播放进度已保存:', {
        title: videoTitleRef.current,
        episode: currentEpisodeIndexRef.current + 1,
        year: detailRef.current?.year,
        progress: `${Math.floor(currentTime)}/${Math.floor(duration)}`,
      });
    } catch (err) {
      console.error('保存播放进度失败:', err);
    }
  };

  useEffect(() => {
    // 页面即将卸载时保存播放进度和清理资源
    const handleBeforeUnload = () => {
      saveCurrentPlayProgress();
      releaseWakeLock();
      cleanupPlayer();
    };

    // 页面可见性变化时保存播放进度和释放 Wake Lock
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentPlayProgress();
        releaseWakeLock();
      } else if (document.visibilityState === 'visible') {
        // 页面重新可见时，如果正在播放则重新请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentEpisodeIndex, detail]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 收藏相关
  // ---------------------------------------------------------------------------
  // 每当 source 或 id 变化时检查收藏状态
  useEffect(() => {
    if (!currentSource || !currentId) return;
    (async () => {
      try {
        const fav = await isFavorited(currentSource, currentId);
        setFavorited(fav);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
      }
    })();
  }, [currentSource, currentId]);

  // 监听收藏数据更新事件
  useEffect(() => {
    if (!currentSource || !currentId) return;

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (favorites: Record<string, any>) => {
        const key = generateStorageKey(currentSource, currentId);
        const isFav = !!favorites[key];
        setFavorited(isFav);
      }
    );

    return unsubscribe;
  }, [currentSource, currentId]);

  // 切换收藏
  const handleToggleFavorite = async () => {
    if (
      !videoTitleRef.current ||
      !detailRef.current ||
      !currentSourceRef.current ||
      !currentIdRef.current
    )
      return;

    try {
      if (favorited) {
        // 如果已收藏，删除收藏
        await deleteFavorite(currentSourceRef.current, currentIdRef.current);
        setFavorited(false);
      } else {
        // 如果未收藏，添加收藏
        await saveFavorite(currentSourceRef.current, currentIdRef.current, {
          title: videoTitleRef.current,
          source_name: detailRef.current?.source_name || '',
          year: detailRef.current?.year || 'unknown',
          cover: detailRef.current?.poster || '',
          total_episodes: detailRef.current?.episodes.length || 1,
          save_time: Date.now(),
          search_title: searchTitle,
          is_completed: getSeriesStatus(detailRef.current) === 'completed',
          vod_remarks: detailRef.current?.vod_remarks,
        });
        setFavorited(true);
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
    }
  };

  // 纠错成功后的回调
  const handleCorrectSuccess = () => {
    if (!detail || detail.source !== 'xiaoya') return;

    // 从 localStorage 读取纠错信息


  };

  useEffect(() => {
    if (
      !videoUrl ||
      loading ||
      currentEpisodeIndex === null ||
      !artRef.current
    ) {
      return;
    }

    // 这类源会先异步补全详情，如果 episodes 为空则跳过


    // 确保选集索引有效
    if (
      !detail ||
      !detail.episodes ||
      currentEpisodeIndex >= detail.episodes.length ||
      currentEpisodeIndex < 0
    ) {
      setError(`选集索引无效，当前共 ${totalEpisodes} 集`);
      return;
    }

    if (!videoUrl) {
      setError('视频地址无效');
      return;
    }
    console.log(videoUrl);

    // 检测是否为WebKit浏览器
    const isWebkit =
      typeof window !== 'undefined' &&
      typeof (window as any).webkitConvertPointFromNodeToPage === 'function';

    // 检测是否为 iOS 设备（iPhone、iPad、iPod）
    const isIOS = (() => {
      if (typeof window === 'undefined') return false;

      const ua = navigator.userAgent;

      // 排除 Windows Phone（它的 UA 中也包含 iPhone）
      if ((window as any).MSStream) return false;

      // 方法1：检测 UA 中的 iOS 设备标识
      if (/iPad|iPhone|iPod/.test(ua)) {
        console.log('[设备检测] iOS 设备（通过 UA）:', ua);
        return true;
      }

      // 方法2：检测 iPad（iOS 13+ 桌面模式）
      // 条件：UA 包含 Mac + 支持触摸 + 不是 Windows/Linux
      const isMacUA = ua.includes('Mac OS X');
      const hasTouch = 'ontouchend' in document;
      const isNotWindows = !ua.includes('Windows');
      const isNotLinux = !ua.includes('Linux');

      if (isMacUA && hasTouch && isNotWindows && isNotLinux) {
        console.log('[设备检测] iPad 桌面模式:', { ua, hasTouch });
        return true;
      }

      console.log('[设备检测] 非 iOS 设备:', { ua, hasTouch });
      return false;
    })();

    // 辅助函数：检测代理 URL 是否需要显式声明 m3u8 类型
    // Artplayer 通过 URL 扩展名自动检测类型，但代理 URL（如 /api/proxy-m3u8?url=...）没有 .m3u8 扩展名
    const getVideoType = (url: string): string | undefined => {
      if (!url) return undefined;
      // 单文件直链（mkv/mp4 等，mediaType=file）：走原生播放，勿强声明 m3u8

      // 如果 URL 路径中已包含 .m3u8 扩展名，Artplayer 可自动检测，无需显式设置
      const urlPath = url.split('?')[0];
      if (urlPath.includes('.m3u8')) return undefined;
      // 代理 URL 返回的是 m3u8 内容，需要显式声明类型
      if (url.includes('/api/proxy-m3u8') || url.includes('/api/proxy/vod/m3u8')) {
        return 'm3u8';
      }
      return undefined;
    };

    const needsHarmonyHlsModeReinit =
      isHarmonyOS &&
      (activeHarmonyHlsPlaybackModeRef.current !== harmonyHlsPlaybackMode ||
        (harmonyHlsPlaybackMode === 'native' &&
          activeNativeHlsAdBlockRef.current !== nativeHlsAdBlockEnabled));

    // 网盘挂载切换 HLS 模式时同样需要整体重建（customType 闭包捕获旧模式）


    // 非WebKit浏览器且播放器已存在，使用switch方法切换


    // WebKit浏览器或首次创建：销毁之前的播放器实例并创建新的
    // 异步初始化播放器
    const initPlayer = async () => {
      try {
        // 先清理旧播放器实例
        if (artPlayerRef.current) {
          await cleanupPlayer();
        }

        // iOS需要等待DOM完全清理
        await new Promise(resolve => setTimeout(resolve, 100));

        // 双重检查：如果旧播放器仍然存在，再次清理
        if (artPlayerRef.current) {
          console.warn('旧播放器仍存在，再次清理');
          await cleanupPlayer();
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 再次确保容器为空
        if (artRef.current) {
          artRef.current.innerHTML = '';
        }

        // 兜底：清理残留到 body 的网页全屏播放器元素，避免盖住新播放器（黑屏只有声音）
        if (typeof document !== 'undefined') {
          document
            .querySelectorAll<HTMLDivElement>('body > .art-fullscreen-web')
            .forEach((el) => el.remove());
        }

        // 动态导入播放器库
        const [ArtplayerModule, HlsModule, AutoThumbnailPlugin] = await Promise.all([
          import('artplayer'),
          import('hls.js'),
          import('@/lib/artplayer-plugin-auto-thumbnail'),
        ]);

        const Artplayer = ArtplayerModule.default;
        const Hls = HlsModule.default;
        const artplayerPluginAutoThumbnail = AutoThumbnailPlugin.default as any;
        const playerTimeouts = new Set<number>();
        const clearTrackedTimeout = (timeoutId: number | null) => {
          if (timeoutId == null) {
            return;
          }

          window.clearTimeout(timeoutId);
          playerTimeouts.delete(timeoutId);
        };
        const schedulePlayerTimeout = (callback: () => void, delay: number) => {
          const timeoutId = window.setTimeout(() => {
            playerTimeouts.delete(timeoutId);
            callback();
          }, delay);
          playerTimeouts.add(timeoutId);
          return timeoutId;
        };
        const clearPlayerTimeouts = () => {
          playerTimeouts.forEach((timeoutId) => {
            window.clearTimeout(timeoutId);
          });
          playerTimeouts.clear();
        };

        const syncPlaybackPitch = () => {
          if (!isWebkit || !artPlayerRef.current?.video) {
            return;
          }

          const video = artPlayerRef.current.video as HTMLVideoElement & {
            webkitPreservesPitch?: boolean;
          };
          const shouldPreservePitch = true;

          if ('preservesPitch' in video) {
            video.preservesPitch = shouldPreservePitch;
          }
          if ('webkitPreservesPitch' in video) {
            video.webkitPreservesPitch = shouldPreservePitch;
          }
        };

        const shouldRescueWebkitHls = (
          video: HTMLVideoElement & {
            hls?: {
              detachMedia?: () => void;
              attachMedia?: (video: HTMLVideoElement) => void;
              startLoad?: (startPosition?: number) => void;
              bufferController?: {
                mediaSource?: {
                  readyState?: string;
                };
              };
            };
          }
        ) => {
          const hls = video.hls;
          if (!hls) {
            return false;
          }

          let hasBufferedData = false;
          try {
            hasBufferedData = video.buffered.length > 0;
          } catch {
            hasBufferedData = false;
          }

          if (video.readyState > 0 || hasBufferedData) {
            return false;
          }

          const currentSrc = video.currentSrc || video.src || '';
          const mediaSourceState = hls.bufferController?.mediaSource?.readyState || '';
          const usingBlobMsePath = currentSrc.startsWith('blob:') && mediaSourceState !== 'closed';

          return !usingBlobMsePath;
        };

        const rescueWebkitHlsBootstrap = (
          reason: string,
          retryDelays: number[] = [1500, 3500, 6000]
        ) => {
          if (!isWebkit || !artPlayerRef.current?.video) {
            return;
          }

          const video = artPlayerRef.current.video as HTMLVideoElement & {
            hls?: {
              detachMedia?: () => void;
              attachMedia?: (video: HTMLVideoElement) => void;
              startLoad?: (startPosition?: number) => void;
            };
          };

          retryDelays.forEach((delay) => {
            schedulePlayerTimeout(() => {
              if (!artPlayerRef.current || artPlayerRef.current.video !== video) {
                return;
              }

              const hls = video.hls;
              if (!shouldRescueWebkitHls(video)) {
                return;
              }

              console.warn(
                `[HLS] Safari bootstrap rescue triggered (${reason}, ${delay}ms)`
              );

              try {
                hls.detachMedia?.();
                hls.attachMedia?.(video);
                hls.startLoad?.(-1);
                video.play().catch((error) => {
                  console.warn('[HLS] Safari rescue play failed:', error);
                });
              } catch (error) {
                console.warn('[HLS] Safari bootstrap rescue failed:', error);
              }
            }, delay);
          });
        };

        // 创建自定义 HLS loader
        const CustomHlsJsLoader = createCustomHlsLoader(Hls);

        // 创建新的播放器实例
        Artplayer.PLAYBACK_RATE = PLAYBACK_RATE_OPTIONS;
        Artplayer.USE_RAF = true;

        // 获取当前集的字幕






        artPlayerRef.current = new Artplayer({
          container: artRef.current!,
          url: videoUrl,
          ...(getVideoType(videoUrl) ? { type: getVideoType(videoUrl) } : {}),
          poster: videoCover,
          volume: 0.7,
          isLive: false,
          muted: false,
          autoplay: true,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: true,
          setting: true,
          loop: false,
          flip: true,
          // 观影室房员隐藏倍速设置，由房主同步控制
          playbackRate: true,
          aspectRatio: false,
          fullscreen: !isIOS,  // iOS 禁用原生全屏按钮，避免触发系统播放器
          fullscreenWeb: true,  // 保留网页全屏按钮（所有平台）
          ...({}),
          subtitleOffset: false,
          miniProgressBar: false,
          mutex: true,
          playsInline: true,
          autoPlayback: false,
          airplay: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          hotkey: false,
          // 观影室房员禁用长按加速（会临时改变倍速）
          fastForward: !false,
          autoOrientation: true,
          lock: true,
          ...(videoQualities.length > 0 ? {
            quality: videoQualities.map((q, index) => ({
              default: index === 0,
              html: q.name,
              url: q.url,
            })),
          } : {}),
          moreVideoAttr: {
            playsInline: true,
            'webkit-playsinline': 'true',
            referrerpolicy: 'no-referrer',
            // 私人影库/网盘直链：配合同级 moontvplus-extension 注入 ACAO，供 Anime4K 读帧。
            // 单文件直链（mediaType=file）与网盘挂载原生 HLS 也先乐观 CORS，
            // 无 ACAO 的 CDN 首次播放 error 时一次性回退 no-cors（见 error 处理器）。
            ...({}),
          } as any,
          // HLS 支持配置
          customType: {
            m3u8: function (video: HTMLVideoElement, url: string) {
              // 网盘挂载原生 HLS：直接把 m3u8 交给浏览器原生播放器（Edge/Safari），
              // 直连网盘 CDN，无需代理与去广告。此时 video 已乐观带上 crossOrigin
              // （配合扩展注入 ACAO 供 Anime4K 读帧）；无 ACAO 时首次播放 error
              // 会触发一次性 no-cors 回退，见 error 处理器。


              if (isHarmonyOS && harmonyHlsPlaybackMode === 'native') {
                if (video.hls) {
                  video.hls.destroy();
                  delete video.hls;
                }

                // 不 attach MediaSource，直接把 m3u8 交给 ArkWeb/浏览器原生播放器。
                // currentSrc 会保留实际播放地址，供浏览器内置投屏功能读取。
                const nativePlaybackUrl = buildNativeHlsPlaybackUrl(url);
                video.src = nativePlaybackUrl;
                ensureVideoSource(video, nativePlaybackUrl);
                video.load();
                return;
              }

              if (!Hls) {
                console.error('HLS.js 未加载');
                return;
              }

              if (video.hls) {
                video.hls.destroy();
              }

              // 每次创建HLS实例时，都读取最新的blockAdEnabled状态
              const shouldUseCustomLoader = blockAdEnabledRef.current;

              // 从localStorage读取缓冲策略
              const bufferStrategy = typeof window !== 'undefined'
                ? localStorage.getItem('bufferStrategy') || 'medium'
                : 'medium';

              // 根据缓冲策略配置不同的缓冲参数
              const getBufferConfig = (strategy: string) => {
                switch (strategy) {
                  case 'low':
                    return {
                      maxBufferLength: 15,
                      backBufferLength: 15,
                      maxBufferSize: 30 * 1000 * 1000, // ~30MB
                    };
                  case 'medium':
                    return {
                      maxBufferLength: 30,
                      backBufferLength: 30,
                      maxBufferSize: 60 * 1000 * 1000, // ~60MB
                    };
                  case 'high':
                    return {
                      maxBufferLength: 60,
                      backBufferLength: 40,
                      maxBufferSize: 120 * 1000 * 1000, // ~120MB
                    };
                  case 'ultra':
                    return {
                      maxBufferLength: 120,
                      backBufferLength: 60,
                      maxBufferSize: 240 * 1000 * 1000, // ~240MB
                    };
                  default:
                    return {
                      maxBufferLength: 30,
                      backBufferLength: 30,
                      maxBufferSize: 60 * 1000 * 1000,
                    };
                }
              };

              const bufferConfig = getBufferConfig(bufferStrategy);

              // 选择合适的 Loader
              let loaderClass;
              if (shouldUseCustomLoader) {
                // 使用自定义广告过滤 Loader
                loaderClass = CustomHlsJsLoader;
              } else {
                // 使用默认 Loader
                loaderClass = Hls.DefaultConfig.loader;
              }

              const hls = new Hls({
                debug: false, // 关闭日志
                enableWorker: true, // WebWorker 解码，降低主线程压力
                // 点播播放不需要 LL-HLS，小缓冲在 Safari 高倍速下更容易抖动。
                lowLatencyMode: false,
                autoStartLoad: true,

                /* 缓冲/内存相关 - 根据用户设置的缓冲策略动态调整 */
                maxBufferLength: bufferConfig.maxBufferLength, // 前向缓冲长度
                backBufferLength: bufferConfig.backBufferLength, // 已播放内容保留长度
                maxBufferSize: bufferConfig.maxBufferSize, // 最大缓冲大小

                /* 自定义loader */
                loader: loaderClass as any,
              });

              const kickStartHlsPlayback = () => {
                try {
                  hls.startLoad(-1);
                } catch (error) {
                  console.warn('[HLS] startLoad failed:', error);
                }

                if (!video.paused) {
                  video.play().catch((error) => {
                    console.warn('[HLS] play after attach failed:', error);
                  });
                }
              };

              hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                kickStartHlsPlayback();
              });

              // 先暴露真实 m3u8 source，供浏览器的投屏/外部播放器在
              // hls.js 将 video.currentSrc 切换为 blob: URL 前完成识别。
              video.hls = hls;
              ensureVideoSource(video, url);
              hls.loadSource(url);
              hls.attachMedia(video);

              if (isWebkit) {
                schedulePlayerTimeout(() => {
                  if (!shouldRescueWebkitHls(video)) {
                    return;
                  }

                  console.warn('[HLS] Safari attach watchdog triggered, forcing reattach');
                  try {
                    hls.detachMedia();
                    hls.attachMedia(video);
                    kickStartHlsPlayback();
                  } catch (error) {
                    console.warn('[HLS] Safari attach reattach failed:', error);
                  }
                }, 3000);
              }

              // 额外确保 iOS 内联播放属性（防止全屏时使用系统播放器）
              video.setAttribute('playsinline', 'true');
              video.setAttribute('webkit-playsinline', 'true');
              (video as any).playsInline = true;
              (video as any).webkitPlaysInline = true;

              // 监听Manifest加载完成事件，启动xiaoya链接定时刷新
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('[HLS] Manifest解析完成');

                const player = artPlayerRef.current;
                if (video.paused && (player?.option.autoplay || player?.loading)) {
                  try {
                    Promise.resolve(player?.play?.()).catch((error) => {
                      console.warn('[HLS] play after manifest parsed failed:', error);
                    });
                  } catch (error) {
                    console.warn('[HLS] play after manifest parsed failed:', error);
                  }
                }

                // 兜底：若 updateVideoUrl 时尚未启定时器，在 manifest 解析后再启
                // xiaoya：仅 m3u8；openlist：refresh14m 即可（此回调本身已在 HLS 路径）

              });

              hls.on(Hls.Events.ERROR, function (event: any, data: any) {
                console.error('HLS Error:', event, data);
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      // 检查是否是 manifest 加载错误（通常是 403/404/CORS 错误）
                      if (data.details === 'manifestLoadError') {
                        console.log('Manifest 加载失败：可能是 403/404 或 CORS 错误');

                        const statusCode = data.response?.code || data.response?.status;

                        // 如果是403且是xiaoya源的m3u8，尝试自动刷新


                        // 原有的错误处理逻辑
                        hls.destroy();
                        if (statusCode === 403) {
                          setVideoError('访问被拒绝 (403)');
                        } else if (statusCode === 404) {
                          setVideoError('视频不存在 (404)');
                        } else if (statusCode === 415) {
                          setVideoError('视频格式不兼容 (415)');
                        } else if (statusCode) {
                          setVideoError(`HTTP ${statusCode} 错误`);
                        } else {
                          // CORS 错误或其他网络错误
                          // 如果是直链直连模式（URL 不含代理前缀），记录原始 URL 以便用户一键启用代理
                          if (currentSourceRef.current === 'directplay' && !url.includes('/api/proxy-m3u8') && !url.includes('/api/proxy/vod/m3u8')) {
                            setCorsFailedUrl(url);
                          }
                          setVideoError('无法访问视频源（可能是跨域限制或访问被拒绝）');
                        }
                        return;
                      }
                      // 检查其他 HTTP 错误状态码
                      {
                        const statusCode = data.response?.code || data.response?.status;
                        if (statusCode && statusCode >= 400) {
                          console.log(`HTTP ${statusCode} 错误`);
                          hls.destroy();
                          setVideoError(`HTTP ${statusCode} 错误`);
                          return;
                        }
                      }
                      console.log('网络错误，尝试恢复...');
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      console.log('媒体错误，尝试恢复...');
                      hls.recoverMediaError();
                      break;
                    default:
                      console.log('无法恢复的错误');
                      hls.destroy();
                      setVideoError('视频加载错误');
                      break;
                  }
                }
              });
            },
          },
          plugins: [
            ...(isPlaybackThumbnailDisabled()
              ? []
              : [
                  artplayerPluginAutoThumbnail({
                    width: 160,
                    number: 100,
                    scale: 1,
                  }),
                ]),

          ],
          icons: {
            loading:
              '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBkPSJNMjUuMjUxIDYuNDYxYy0xMC4zMTggMC0xOC42ODMgOC4zNjUtMTguNjgzIDE4LjY4M2g0LjA2OGMwLTguMDcgNi41NDUtMTQuNjE1IDE0LjYxNS0xNC42MTVWNi40NjF6IiBmaWxsPSIjMDA5Njg4Ij48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHRvPSIzNjAgMjUgMjUiIHR5cGU9InJvdGF0ZSIvPjwvcGF0aD48L3N2Zz4=">',
          },
          settings: [
            {
              html: '去广告',
              icon: '<text x="50%" y="50%" font-size="20" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">AD</text>',
              tooltip: blockAdEnabled ? '已开启' : '已关闭',
              onClick() {
                const newVal = !blockAdEnabled;
                try {
                  localStorage.setItem('enable_blockad', String(newVal));
                  if (artPlayerRef.current) {
                    resumeTimeRef.current = artPlayerRef.current.currentTime;
                    if (
                      artPlayerRef.current.video &&
                      artPlayerRef.current.video.hls
                    ) {
                      artPlayerRef.current.video.hls.destroy();
                    }
                    artPlayerRef.current.destroy();
                    artPlayerRef.current = null;
                  }
                  setBlockAdEnabled(newVal);
                } catch (_) { // No recovery is needed here.
 }
                return newVal ? '当前开启' : '当前关闭';
              },
            },

            // 热力图开关（仅在未禁用时显示）
            ...([]),
            ...(webGPUSupported ? [
              {
                name: 'Anime4K超分',
                html: 'Anime4K超分',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-4 0-7-3-7-7V9l7-3.5L19 9v4c0 4-3 7-7 7z" fill="#ffffff"/><path d="M10 12l2 2 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                switch: anime4kEnabledRef.current,
                onSwitch: async function (item: any) {
                  const newVal = !item.switch;
                  await toggleAnime4K(newVal);
                  return newVal;
                },
              },
              {
                name: '超分模式',
                html: '超分模式',
                selector: [
                  {
                    html: 'ModeA (快速)',
                    value: 'ModeA',
                    default: anime4kModeRef.current === 'ModeA',
                  },
                  {
                    html: 'ModeB (平衡)',
                    value: 'ModeB',
                    default: anime4kModeRef.current === 'ModeB',
                  },
                  {
                    html: 'ModeC (质量)',
                    value: 'ModeC',
                    default: anime4kModeRef.current === 'ModeC',
                  },
                  {
                    html: 'ModeAA (增强快速)',
                    value: 'ModeAA',
                    default: anime4kModeRef.current === 'ModeAA',
                  },
                  {
                    html: 'ModeBB (增强平衡)',
                    value: 'ModeBB',
                    default: anime4kModeRef.current === 'ModeBB',
                  },
                  {
                    html: 'ModeCA (最高质量)',
                    value: 'ModeCA',
                    default: anime4kModeRef.current === 'ModeCA',
                  },
                ],
                onSelect: async function (item: any) {
                  await changeAnime4KMode(item.value);
                  return item.html;
                },
              },
              {
                name: '超分倍数',
                html: '超分倍数',
                selector: [
                  {
                    html: '1.5x',
                    value: '1.5',
                    default: anime4kScaleRef.current === 1.5,
                  },
                  {
                    html: '2.0x',
                    value: '2.0',
                    default: anime4kScaleRef.current === 2.0,
                  },
                  {
                    html: '3.0x',
                    value: '3.0',
                    default: anime4kScaleRef.current === 3.0,
                  },
                  {
                    html: '4.0x',
                    value: '4.0',
                    default: anime4kScaleRef.current === 4.0,
                  },
                ],
                onSelect: async function (item: any) {
                  await changeAnime4KScale(parseFloat(item.value));
                  return item.html;
                },
              }
            ] : []),
            {
              name: '跳过片头片尾',
              html: '跳过片头片尾',
              switch: skipConfigRef.current.enable,
              onSwitch: function (item) {
                const newConfig = {
                  ...skipConfigRef.current,
                  enable: !item.switch,
                };
                handleSkipConfigChange(newConfig);
                return !item.switch;
              },
            },
            {
              name: '快捷快进配置',
              html: '快捷快进配置',
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5v14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><path d="m16 17 5-5-5-5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12H9" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>',
              tooltip: `${formatQuickForwardDuration(quickForwardSecondsRef.current)}`,
              onClick: async function () {
                const player = artPlayerRef.current;
                if (player?.fullscreen) {
                  player.fullscreen = false;
                  await new Promise(resolve => setTimeout(resolve, 300));
                }

                const existingDialog = document.querySelector('.quick-forward-settings-dialog');
                existingDialog?.remove();

                const container = document.createElement('div');
                container.className = 'quick-forward-settings-dialog';
                container.style.cssText = `
                  position: fixed;
                  inset: 0;
                  z-index: 10000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
                  background: rgba(0, 0, 0, 0.6);
                  backdrop-filter: blur(3px);
                `;
                container.innerHTML = `
                  <div role="dialog" aria-modal="true" style="width: min(360px, 100%); background: #1f2937; color: #fff; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 20px; box-shadow: 0 16px 48px rgba(0,0,0,.45);">
                    <div style="font-size: 17px; font-weight: 600; margin-bottom: 8px;">快捷快进设置</div>
                    <div style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-bottom: 16px;">设置点击底部按钮或按 P 键时向前跳转的时间。</div>
                    <label for="quick-forward-input" style="display: block; color: #d1d5db; font-size: 13px; margin-bottom: 6px;">快进时长（秒）</label>
                    <input id="quick-forward-input" type="number" min="1" step="1" value="${quickForwardSecondsRef.current}" style="box-sizing: border-box; width: 100%; height: 40px; padding: 0 10px; border: 1px solid #4b5563; border-radius: 6px; background: #111827; color: #fff; font-size: 14px; outline: none;" />
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px;">
                      <button type="button" data-action="cancel" style="height: 36px; padding: 0 14px; border: 0; border-radius: 6px; background: #374151; color: #fff; cursor: pointer;">取消</button>
                      <button type="button" data-action="confirm" style="height: 36px; padding: 0 14px; border: 0; border-radius: 6px; background: #0d9488; color: #fff; cursor: pointer;">保存</button>
                    </div>
                  </div>
                `;
                document.body.appendChild(container);

                const input = container.querySelector('#quick-forward-input') as HTMLInputElement;
                const cancelButton = container.querySelector('[data-action="cancel"]');
                const confirmButton = container.querySelector('[data-action="confirm"]');
                const cleanup = () => container.remove();
                const save = () => {
                  const nextSeconds = Number(input.value);
                  if (!Number.isFinite(nextSeconds) || nextSeconds <= 0) {
                    input.focus();
                    if (artPlayerRef.current) {
                      artPlayerRef.current.notice.show = '请输入大于 0 的有效秒数';
                    }
                    return;
                  }

                  const normalizedSeconds = Math.max(1, Math.round(nextSeconds));
                  setQuickForwardSeconds(normalizedSeconds);
                  quickForwardSecondsRef.current = normalizedSeconds;
                  localStorage.setItem('quickForwardSeconds', String(normalizedSeconds));
                  if (artPlayerRef.current) {
                    artPlayerRef.current.notice.show = `快捷快进已设置为${formatQuickForwardDuration(normalizedSeconds)}`;
                  }
                  cleanup();
                };

                cancelButton?.addEventListener('click', cleanup);
                confirmButton?.addEventListener('click', save);
                container.addEventListener('click', (event) => {
                  if (event.target === container) cleanup();
                });
                input.addEventListener('keydown', (event) => {
                  if (event.key === 'Enter') save();
                  if (event.key === 'Escape') cleanup();
                });
                input.focus();
                input.select();
                return '打开设置';
              },
            },
            {
              name: '跳过配置',
              html: '跳过配置',
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="2" fill="#ffffff"/><path d="M9 12L15 12" stroke="#ffffff" stroke-width="2"/><circle cx="19" cy="12" r="2" fill="#ffffff"/></svg>',
              tooltip:
                skipConfigRef.current.intro_time === 0 && skipConfigRef.current.outro_time === 0
                  ? '设置跳过配置'
                  : `片头: ${formatTime(skipConfigRef.current.intro_time)} | 片尾: ${formatTime(Math.abs(skipConfigRef.current.outro_time))}`,
              onClick: async function () {
                const player = artPlayerRef.current;
                if (player) {
                  // 如果处于全屏状态，先退出全屏
                  if (player.fullscreen) {
                    player.fullscreen = false;
                    // 等待全屏退出动画完成
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }

                  // 使用 ArtPlayer 的 prompt 功能创建输入弹窗
                  const currentIntro = skipConfigRef.current.intro_time || 0;
                  const currentOutro = Math.abs(skipConfigRef.current.outro_time) || 0;

                  // 创建一个自定义的提示框
                  const container = document.createElement('div');
                  container.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: rgba(0, 0, 0, 0.9);
                  padding: 20px;
                  border-radius: 8px;
                  z-index: 9999;
                  min-width: 300px;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                `;

                  container.innerHTML = `
                  <div style="color: white; margin-bottom: 15px; font-size: 16px; font-weight: bold; border-bottom: 1px solid #444; padding-bottom: 10px;">
                    跳过配置
                  </div>
                  <div style="color: #aaa; font-size: 13px; margin-bottom: 15px; line-height: 1.5;">
                    设置片头片尾跳过时间，到达时间自动跳过
                  </div>
                  <div style="margin-bottom: 10px;">
                    <label style="color: white; display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">
                      片头时间 (秒)
                      <span style="color: #888; font-size: 12px; font-weight: normal; margin-left: 8px;">从视频开始跳过的时长</span>
                    </label>
                    <div style="display: flex; gap: 8px;">
                      <input id="intro-input" type="number" min="0" step="1" value="${currentIntro}" placeholder="如: 90"
                             style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #222; color: white; font-size: 14px;" />
                      <button id="set-intro-btn" style="padding: 8px 12px; border-radius: 4px; border: none; background: #007bff; color: white; cursor: pointer; font-size: 14px; white-space: nowrap;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
                          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                          <path d="M12 6v6l4 4" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        当前时间
                      </button>
                    </div>
                  </div>
                  <div style="margin-bottom: 15px;">
                    <label style="color: white; display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500;">
                      片尾时间 (秒)
                      <span style="color: #888; font-size: 12px; font-weight: normal; margin-left: 8px;">从视频结尾向前跳过的时长</span>
                    </label>
                    <div style="display: flex; gap: 8px;">
                      <input id="outro-input" type="number" min="0" step="1" value="${currentOutro}" placeholder="如: 120"
                             style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #222; color: white; font-size: 14px;" />
                      <button id="set-outro-btn" style="padding: 8px 12px; border-radius: 4px; border: none; background: #007bff; color: white; cursor: pointer; font-size: 14px; white-space: nowrap;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
                          <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                          <path d="M12 6v6l4 4" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        当前时间
                      </button>
                    </div>
                  </div>
                  <div style="background: rgba(0, 123, 255, 0.1); border-left: 3px solid #007bff; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
                    <div style="color: #88c0ff; font-size: 12px; line-height: 1.6;">
                      <div style="margin-bottom: 4px;">💡 <strong>提示：</strong></div>
                      <div>• 点击"当前时间"可快速设置为播放位置</div>
                      <div>• 片头90秒表示跳过前1分30秒</div>
                      <div>• 片尾120秒表示跳过最后2分钟</div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #444; padding-top: 15px;">
                    <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #444; color: white; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#555'" onmouseout="this.style.background='#444'">取消</button>
                    <button id="clear-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #d9534f; color: white; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#c9302c'" onmouseout="this.style.background='#d9534f'">清除</button>
                    <button id="confirm-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #5cb85c; color: white; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#4cae4c'" onmouseout="this.style.background='#5cb85c'">确定</button>
                  </div>
                `;

                  document.body.appendChild(container);

                  const introInput = container.querySelector('#intro-input') as HTMLInputElement;
                  const outroInput = container.querySelector('#outro-input') as HTMLInputElement;
                  const setIntroBtn = container.querySelector('#set-intro-btn');
                  const setOutroBtn = container.querySelector('#set-outro-btn');
                  const cancelBtn = container.querySelector('#cancel-btn');
                  const clearBtn = container.querySelector('#clear-btn');
                  const confirmBtn = container.querySelector('#confirm-btn');

                  const cleanup = () => {
                    document.body.removeChild(container);
                  };

                  // 设置片头为当前时间
                  setIntroBtn?.addEventListener('click', () => {
                    const currentTime = player.currentTime || 0;
                    if (currentTime > 0) {
                      introInput.value = Math.floor(currentTime).toString();
                    }
                  });

                  // 设置片尾为当前时间到结束的时长
                  setOutroBtn?.addEventListener('click', () => {
                    if (player.duration && player.currentTime) {
                      const outroTime = player.duration - player.currentTime;
                      if (outroTime > 0) {
                        outroInput.value = Math.floor(outroTime).toString();
                      }
                    }
                  });

                  cancelBtn?.addEventListener('click', cleanup);

                  clearBtn?.addEventListener('click', () => {
                    handleSkipConfigChange({
                      enable: false,
                      intro_time: 0,
                      outro_time: 0,
                    });
                    cleanup();
                  });

                  confirmBtn?.addEventListener('click', () => {
                    const introTime = parseFloat(introInput.value) || 0;
                    const outroTime = parseFloat(outroInput.value) || 0;

                    const newConfig = {
                      ...skipConfigRef.current,
                      intro_time: introTime,
                      outro_time: outroTime > 0 ? -outroTime : 0,
                    };

                    handleSkipConfigChange(newConfig);
                    cleanup();
                  });

                  // 支持 Enter 键确认
                  const handleEnter = (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      confirmBtn?.dispatchEvent(new Event('click'));
                    } else if (e.key === 'Escape') {
                      cancelBtn?.dispatchEvent(new Event('click'));
                    }
                  };

                  introInput.addEventListener('keydown', handleEnter);
                  outroInput.addEventListener('keydown', handleEnter);
                }
                return '';
              },
            },
          ],
          // 控制栏配置
          controls: [
            {
              position: 'left',
              index: 40,
              html: `<i class="art-icon flex quick-forward-control"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m16 17 5-5-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></i>`,
              tooltip: '快捷快进',
              mounted: ($el: HTMLElement) => {
                $el.classList.add('quick-forward-control-wrapper');
                if (!document.getElementById('quick-forward-control-style')) {
                  const style = document.createElement('style');
                  style.id = 'quick-forward-control-style';
                  style.textContent = `
                    @media (max-width: 767px) and (orientation: portrait) {
                      .quick-forward-control-wrapper {
                        display: none !important;
                      }
                    }
                  `;
                  document.head.appendChild(style);
                }
              },
              click: function () {
                seekQuickForward();
              },
            },
            {
              position: 'left',
              index: 13,
              html: '<i class="art-icon flex"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></i>',
              tooltip: '播放下一集',
              click: function () {
                // 房员禁用下一集按钮

                handleNextEpisode();
              },
            },
            // iOS 设备上添加自定义全屏按钮（横屏和竖屏都显示）
            ...(isIOS ? [{
              position: 'right',
              index: 100,  // 大数字确保在设置按钮右边
              html: '<i class="art-icon ios-portrait-fullscreen"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg></i>',
              tooltip: '全屏',
              style: {
                color: '#fff',
              },
              mounted: function ($el: HTMLElement) {
                // 添加 CSS 样式：横屏和竖屏都显示
                const style = document.createElement('style');
                style.textContent = `
                /* iOS 自定义全屏按钮在所有方向都显示 */
                .ios-portrait-fullscreen {
                  display: inline-flex !important;
                }
                /* iOS 全屏选择对话框样式（遵循项目统一风格） */
                .ios-fullscreen-dialog {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(0, 0, 0, 0.6);
                  backdrop-filter: blur(4px);
                  z-index: 1000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
                }
                .ios-fullscreen-dialog-content {
                  background: white;
                  border-radius: 16px;
                  max-width: 480px;
                  width: 100%;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                  overflow: hidden;
                }
                .dark .ios-fullscreen-dialog-content {
                  background: rgb(31, 41, 55);
                }

                /* 标题栏 */
                .ios-fullscreen-dialog-header {
                  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                  padding: 20px 24px;
                }
                .ios-fullscreen-dialog-title {
                  font-size: 20px;
                  font-weight: 700;
                  color: white;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 6px;
                }
                .ios-fullscreen-dialog-title svg {
                  stroke: white;
                }
                .ios-fullscreen-dialog-subtitle {
                  font-size: 14px;
                  color: rgba(255, 255, 255, 0.9);
                  margin: 0;
                }

                /* 选项列表 */
                .ios-fullscreen-dialog-options {
                  padding: 16px;
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }
                .ios-fullscreen-option {
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  padding: 16px;
                  background: rgb(249, 250, 251);
                  border: 2px solid transparent;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-align: left;
                }
                .dark .ios-fullscreen-option {
                  background: rgba(55, 65, 81, 0.5);
                }
                .ios-fullscreen-option:hover {
                  background: rgb(243, 244, 246);
                  border-color: #22c55e;
                  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
                }
                .dark .ios-fullscreen-option:hover {
                  background: rgb(55, 65, 81);
                }
                .ios-fullscreen-option:active {
                  transform: scale(0.98);
                }

                /* 推荐选项 */
                .ios-fullscreen-option-recommended {
                  border-color: #22c55e;
                }

                /* 选项图标 */
                .ios-fullscreen-option-icon {
                  flex-shrink: 0;
                  width: 48px;
                  height: 48px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: white;
                  border-radius: 10px;
                  color: #22c55e;
                }
                .dark .ios-fullscreen-option-icon {
                  background: rgb(31, 41, 55);
                }
                .ios-fullscreen-option-recommended .ios-fullscreen-option-icon {
                  background: #22c55e;
                  color: white;
                }

                /* 选项内容 */
                .ios-fullscreen-option-content {
                  flex: 1;
                }
                .ios-fullscreen-option-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: rgb(17, 24, 39);
                  margin-bottom: 4px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .dark .ios-fullscreen-option-title {
                  color: white;
                }
                .ios-fullscreen-option-badge {
                  display: inline-block;
                  padding: 2px 8px;
                  background: #22c55e;
                  color: white;
                  font-size: 12px;
                  font-weight: 500;
                  border-radius: 4px;
                }
                .ios-fullscreen-option-desc {
                  font-size: 13px;
                  color: rgb(107, 114, 128);
                  line-height: 1.4;
                }
                .dark .ios-fullscreen-option-desc {
                  color: rgb(156, 163, 175);
                }

                /* 箭头图标 */
                .ios-fullscreen-option-arrow {
                  flex-shrink: 0;
                  color: rgb(209, 213, 219);
                  transition: transform 0.2s;
                }
                .dark .ios-fullscreen-option-arrow {
                  color: rgb(75, 85, 99);
                }
                .ios-fullscreen-option:hover .ios-fullscreen-option-arrow {
                  transform: translateX(4px);
                  color: #22c55e;
                }

                /* 底部提示 */
                .ios-fullscreen-dialog-footer {
                  padding: 16px 24px;
                  background: rgb(249, 250, 251);
                  border-top: 1px solid rgb(229, 231, 235);
                  display: flex;
                  align-items: flex-start;
                  gap: 10px;
                  font-size: 12px;
                  color: rgb(107, 114, 128);
                  line-height: 1.5;
                }
                .dark .ios-fullscreen-dialog-footer {
                  background: rgba(17, 24, 39, 0.5);
                  border-top-color: rgb(55, 65, 81);
                  color: rgb(156, 163, 175);
                }
                .ios-fullscreen-dialog-footer svg {
                  flex-shrink: 0;
                  margin-top: 2px;
                  stroke: currentColor;
                }
              `;
                document.head.appendChild(style);
              },
              click: function () {
                if (!artPlayerRef.current) return;

                // 检测是否在 PWA 模式下
                const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches ||
                  (window.navigator as any).standalone === true;

                // 检查是否已经在原生全屏状态
                const isInNativeFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

                // 如果已经在原生全屏状态，退出原生全屏
                if (isInNativeFullscreen) {
                  const exitFullscreen = (document as any).exitFullscreen ||
                    (document as any).webkitExitFullscreen ||
                    (document as any).mozCancelFullScreen ||
                    (document as any).msExitFullscreen;
                  if (exitFullscreen) {
                    try {
                      const result = exitFullscreen.call(document);
                      if (result && typeof result.catch === 'function') {
                        result.catch((err: Error) => console.error('退出全屏失败:', err));
                      }
                    } catch (err) {
                      console.error('退出全屏失败:', err);
                    }
                  }
                  return;
                }

                // 如果已经在网页全屏状态，退出网页全屏
                if (artPlayerRef.current.fullscreenWeb) {
                  artPlayerRef.current.fullscreenWeb = false;
                  return;
                }

                // 如果在 PWA 模式下，直接使用容器全屏（可以隐藏状态栏）
                if (isPWA) {
                  const container = artPlayerRef.current.template.$container;
                  if (container && container.webkitEnterFullscreen) {
                    container.webkitEnterFullscreen().catch((err: Error) => {
                      console.error('PWA 全屏失败:', err);
                      // 如果失败，降级使用网页全屏
                      artPlayerRef.current.fullscreenWeb = true;
                    });
                  } else {
                    // 不支持原生全屏，使用网页全屏
                    artPlayerRef.current.fullscreenWeb = true;
                  }
                  return;
                }

                // 非 PWA 模式：创建对话框（使用项目统一风格）
                const dialog = document.createElement('div');
                dialog.className = 'ios-fullscreen-dialog';
                dialog.innerHTML = `
                <div class="ios-fullscreen-dialog-content">
                  <!-- 标题栏 -->
                  <div class="ios-fullscreen-dialog-header">
                    <h3 class="ios-fullscreen-dialog-title">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" stroke="currentColor" stroke-width="2" fill="none"/>
                      </svg>
                      选择全屏模式
                    </h3>
                    <p class="ios-fullscreen-dialog-subtitle">
                      由于 iOS 系统限制，原生全屏会使用系统播放器，将无法显示弹幕及使用部分播放器功能。网页全屏可能无法完全占满屏幕，但可保留所有功能。
                    </p>
                  </div>

                  <!-- 选项列表 -->
                  <div class="ios-fullscreen-dialog-options">
                    <!-- 网页全屏选项 -->
                    <button class="ios-fullscreen-option ios-fullscreen-option-recommended" data-action="web">
                      <div class="ios-fullscreen-option-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                          <path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" fill="currentColor"/>
                        </svg>
                      </div>
                      <div class="ios-fullscreen-option-content">
                        <div class="ios-fullscreen-option-title">
                          网页全屏
                          <span class="ios-fullscreen-option-badge">推荐</span>
                        </div>
                        <div class="ios-fullscreen-option-desc">
                          保留弹幕、控制栏等所有功能
                        </div>
                      </div>
                      <svg class="ios-fullscreen-option-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>

                    <!-- 原生全屏选项 -->
                    <button class="ios-fullscreen-option" data-action="native">
                      <div class="ios-fullscreen-option-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                      </div>
                      <div class="ios-fullscreen-option-content">
                        <div class="ios-fullscreen-option-title">
                          原生全屏
                        </div>
                        <div class="ios-fullscreen-option-desc">
                          使用系统播放器，部分功能不可用
                        </div>
                      </div>
                      <svg class="ios-fullscreen-option-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>

                  <!-- 底部提示 -->
                  <div class="ios-fullscreen-dialog-footer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>将网站添加到主屏幕（PWA）后，网页全屏可以完全全屏</span>
                  </div>
                </div>
              `;

                // 添加到页面
                document.body.appendChild(dialog);

                // 点击背景关闭
                dialog.addEventListener('click', (e) => {
                  if (e.target === dialog) {
                    document.body.removeChild(dialog);
                  }
                });

                // 按钮点击事件
                const buttons = dialog.querySelectorAll('.ios-fullscreen-option');
                buttons.forEach(button => {
                  button.addEventListener('click', () => {
                    const action = button.getAttribute('data-action');

                    if (action === 'web') {
                      // 网页全屏
                      if (artPlayerRef.current) {
                        artPlayerRef.current.fullscreenWeb = true;
                      }
                    } else if (action === 'native') {
                      // 原生全屏（尝试使用浏览器的全屏 API）
                      if (artPlayerRef.current && artPlayerRef.current.template.$video) {
                        const videoElement = artPlayerRef.current.template.$video;
                        if (videoElement.requestFullscreen) {
                          videoElement.requestFullscreen();
                        } else if ((videoElement as any).webkitEnterFullscreen) {
                          (videoElement as any).webkitEnterFullscreen();
                        }
                      }
                    }

                    // 关闭对话框
                    document.body.removeChild(dialog);
                  });
                });
              },
            }] : []),
          ],
        });

        artPlayerRef.current.on('destroy', () => {
          clearPlayerTimeouts();
        });

        artPlayerRef.current.on('flip', syncAnime4KCanvasFlip);

        // 监听播放器事件
        artPlayerRef.current.on('ready', async () => {
          setError(null);

          // 换集重建前处于网页全屏则恢复，避免用户换集时被踢出全屏
          if (restoreWebFullscreenOnReadyRef.current && artPlayerRef.current) {
            restoreWebFullscreenOnReadyRef.current = false;
            try {
              artPlayerRef.current.fullscreenWeb = true;
            } catch (err) {
              console.warn('恢复网页全屏失败:', err);
            }
          }

          rescueWebkitHlsBootstrap('player-ready');

          // 标记播放器已就绪，触发 usePlaySync 设置事件监听器
          setPlayerReady(true);
          console.log('[PlayPage] Player ready, triggering sync setup');

          // 应用进度条图标配置 - 尽早执行




          // 添加字幕切换和本地字幕上传功能；ASS/SSA/PGS 需要播放器 ready 后挂载专用渲染器




          // 添加字幕大小设置


          // 控制截图按钮在小屏幕竖屏时隐藏
          const updateScreenshotVisibility = () => {
            const screenshotBtn = document.querySelector('.art-control-screenshot') as HTMLElement;
            if (screenshotBtn) {
              const isPortrait = window.innerHeight > window.innerWidth;
              const isSmallScreen = window.innerWidth < 768;
              screenshotBtn.style.display = (isPortrait && isSmallScreen) ? 'none' : '';
            }
          };
          updateScreenshotVisibility();
          window.addEventListener('resize', updateScreenshotVisibility);
          artPlayerRef.current.on('fullscreen', updateScreenshotVisibility);
          artPlayerRef.current.on('fullscreenWeb', updateScreenshotVisibility);

          // iOS 设备：动态调整弹幕设置面板位置，避免被遮挡
          if (isIOS && artPlayerRef.current) {
            // 使用 MutationObserver 监听弹幕设置面板的显示
            let isAdjusting = false; // 防止重复调整的标记
            const observer = new MutationObserver(() => {
              if (isAdjusting) return; // 如果正在调整，跳过

              const panel = document.querySelector('.apd-config-panel') as HTMLElement;
              if (panel && panel.style.display !== 'none') {
                // 获取当前的 left 值
                const currentLeft = parseInt(panel.style.left || '0', 10);

                // 如果 left 值异常小（iOS 上只有 -5px），调整为正常值（-246px，比标准位置再往左 100px）
                if (currentLeft > -50) {
                  isAdjusting = true; // 设置标记，防止重复触发
                  const adjustedLeft = -246;
                  panel.style.left = `${adjustedLeft}px`;
                  console.log('[iOS] 已调整弹幕设置面板位置: 从', currentLeft, '调整为', adjustedLeft);

                  // 延迟重置标记
                  setTimeout(() => {
                    isAdjusting = false;
                  }, 100);
                }
              }
            });

            // 监听整个播放器容器的 DOM 变化
            if (artRef.current) {
              observer.observe(artRef.current, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
              });
            }

            // 清理函数
            artPlayerRef.current.on('destroy', () => {
              observer.disconnect();
            });
          }

          // iOS 设备：监听屏幕方向变化，自动调整全屏状态
          if (isIOS && artPlayerRef.current) {
            const handleOrientationChange = () => {
              if (!artPlayerRef.current) return;

              // 获取当前屏幕方向
              const isLandscape = window.matchMedia('(orientation: landscape)').matches;
              const isPortrait = window.matchMedia('(orientation: portrait)').matches;

              console.log('[iOS] 屏幕方向变化:', {
                isLandscape,
                isPortrait,
                fullscreenWeb: artPlayerRef.current.fullscreenWeb
              });

              // 如果在网页全屏状态下旋转到横屏，切换到正常全屏
              if (artPlayerRef.current.fullscreenWeb && isLandscape) {
                console.log('[iOS] 横屏模式：从网页全屏切换到正常全屏');
                // 先退出网页全屏
                artPlayerRef.current.fullscreenWeb = false;
                // 延迟一下再进入正常全屏，确保布局已更新
                setTimeout(() => {
                  if (artPlayerRef.current) {
                    artPlayerRef.current.fullscreenWeb = true;
                  }
                }, 100);
              }
            };

            // 监听屏幕方向变化
            window.addEventListener('orientationchange', handleOrientationChange);
            // 也监听 resize 事件（某些设备上更可靠）
            window.addEventListener('resize', handleOrientationChange);

            // 清理函数
            artPlayerRef.current.on('destroy', () => {
              window.removeEventListener('orientationchange', handleOrientationChange);
              window.removeEventListener('resize', handleOrientationChange);
            });
          }

          // 从 art.storage 读取弹幕设置并应用


          // 保存弹幕插件引用


          // 播放器就绪后，如果正在播放则请求 Wake Lock
          if (artPlayerRef.current && !artPlayerRef.current.paused) {
            requestWakeLock();
          }
        });

        // 监听播放状态变化，控制 Wake Lock
        artPlayerRef.current.on('play', () => {
          requestWakeLock();
        });

        artPlayerRef.current.on('pause', () => {
          releaseWakeLock();
          saveCurrentPlayProgress();
        });

        artPlayerRef.current.on('video:ended', () => {
          releaseWakeLock();
        });

        // 如果播放器初始化时已经在播放状态，则请求 Wake Lock
        if (artPlayerRef.current && !artPlayerRef.current.paused) {
          requestWakeLock();
        }

        artPlayerRef.current.on('video:volumechange', () => {
          lastVolumeRef.current = artPlayerRef.current.volume;
        });
        artPlayerRef.current.on('video:ratechange', () => {
          const currentRate = artPlayerRef.current.playbackRate;

          // 观影室同步来的倍速不写入个人偏好，退出房间后仍使用自己的倍速


          const shouldIgnoreSafariReset =
            isWebkit &&
            Date.now() < playbackRateRestoreWindowUntilRef.current &&
            Math.abs(currentRate - 1) < 0.01 &&
            lastPlaybackRateRef.current > 1;

          if (shouldIgnoreSafariReset) {
            // Safari 切集后可能偷偷回到 1x，这不是用户真实选择，不要覆盖记忆值。
            schedulePlayerTimeout(() => {
              if (
                artPlayerRef.current &&
                Math.abs(
                  artPlayerRef.current.playbackRate - lastPlaybackRateRef.current
                ) > 0.01
              ) {
                artPlayerRef.current.playbackRate = lastPlaybackRateRef.current;
              }
            }, 0);
            syncPlaybackPitch();
            return;
          }

          lastPlaybackRateRef.current = currentRate;
          persistPlaybackRate(currentRate);
          syncPlaybackPitch();
        });
        artPlayerRef.current.on('video:playing', () => {
          if (
            isWebkit &&
            Date.now() < playbackRateRestoreWindowUntilRef.current &&
            Math.abs(
              artPlayerRef.current.playbackRate - lastPlaybackRateRef.current
            ) > 0.01
          ) {
            artPlayerRef.current.playbackRate = lastPlaybackRateRef.current;
          }
        });

        // 监听网页全屏事件，控制导航栏显示隐藏
        artPlayerRef.current.on('fullscreenWeb', (isFullscreen: boolean) => {
          console.log('网页全屏状态变化:', isFullscreen);
          setIsWebFullscreen(isFullscreen);
        });

        // 添加自定义热力图到播放器控制层


        // 添加全屏快进快退按钮
        artPlayerRef.current.layers.add({
          name: 'seek-buttons',
          html: `
          <div class="seek-buttons-container" style="display: none;">
            <button class="seek-button seek-backward" style="position: fixed; left: 20px; top: 40%; transform: translateY(-50%); width: 48px; height: 48px; background: rgba(0,0,0,0.7); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; transition: opacity 0.2s;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" fill="white"/>
              </svg>
            </button>
            <button class="seek-button seek-forward" style="position: fixed; right: 20px; top: 40%; transform: translateY(-50%); width: 48px; height: 48px; background: rgba(0,0,0,0.7); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; transition: opacity 0.2s;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" fill="white"/>
              </svg>
            </button>
          </div>
        `,
          mounted: ($el: HTMLElement) => {
            const container = $el.querySelector('.seek-buttons-container') as HTMLElement;
            const backwardBtn = $el.querySelector('.seek-backward') as HTMLElement;
            const forwardBtn = $el.querySelector('.seek-forward') as HTMLElement;

            // 快退5秒
            backwardBtn.onclick = () => {
              if (artPlayerRef.current) {
                artPlayerRef.current.currentTime = Math.max(0, artPlayerRef.current.currentTime - 5);
              }
            };

            // 快进5秒
            forwardBtn.onclick = () => {
              if (artPlayerRef.current) {
                artPlayerRef.current.currentTime = Math.min(artPlayerRef.current.duration, artPlayerRef.current.currentTime + 5);
              }
            };

            // 监听全屏状态变化
            const updateVisibility = () => {
              const isFullscreen = artPlayerRef.current?.fullscreen || artPlayerRef.current?.fullscreenWeb || !!document.fullscreenElement;
              const isMobile = Math.min(window.innerWidth, window.innerHeight) < 768;
              const controlsVisible = !artPlayerRef.current?.template?.$player?.classList.contains('art-hide-cursor');

              if (container) {
                const shouldShow = isFullscreen && isMobile && controlsVisible;
                container.style.display = shouldShow ? 'block' : 'none';
              }
            };

            artPlayerRef.current.on('fullscreen', updateVisibility);
            artPlayerRef.current.on('fullscreenWeb', updateVisibility);
            document.addEventListener('fullscreenchange', updateVisibility);
            window.addEventListener('resize', updateVisibility);

            // 监听鼠标移动和视频事件来检测控件显示/隐藏
            artPlayerRef.current.on('video:timeupdate', updateVisibility);
            if (artPlayerRef.current.template?.$player) {
              const observer = new MutationObserver(updateVisibility);
              observer.observe(artPlayerRef.current.template.$player, {
                attributes: true,
                attributeFilter: ['class']
              });
            }

            updateVisibility();
          },
        });

        // 监听视频可播放事件，这时恢复播放进度更可靠
        artPlayerRef.current.on('video:canplay', () => {
          let restoredResumeTime = false;

          // 若存在需要恢复的播放进度，则跳转
          if (resumeTimeRef.current && resumeTimeRef.current > 0) {
            try {
              const duration = artPlayerRef.current.duration || 0;
              let target = resumeTimeRef.current;
              if (duration && target >= duration - 2) {
                target = Math.max(0, duration - 5);
              }
              artPlayerRef.current.currentTime = target;
              restoredResumeTime = true;
              console.log('成功恢复播放进度到:', resumeTimeRef.current);
            } catch (err) {
              console.warn('恢复播放进度失败:', err);
            }
          }
          resumeTimeRef.current = null;

          const shouldResumePlaying =
            resumePlayingAfterHlsModeSwitchRef.current;
          resumePlayingAfterHlsModeSwitchRef.current = null;
          if (shouldResumePlaying === false) {
            artPlayerRef.current.pause();
          } else if (shouldResumePlaying === true) {
            Promise.resolve(artPlayerRef.current.play()).catch((error) => {
              console.warn('[Harmony HLS] 恢复播放失败:', error);
            });
          }

          schedulePlayerTimeout(() => {
            if (!artPlayerRef.current) {
              return;
            }

            const restorePlaybackRate = () => {
              if (!artPlayerRef.current) {
                return;
              }

              // 观影室房员恢复到房主同步的倍速，其他人恢复到记忆倍速
              const targetRate =
                null ?? lastPlaybackRateRef.current;
              if (
                Math.abs(artPlayerRef.current.playbackRate - targetRate) >
                  0.01 &&
                isWebkit
              ) {
                artPlayerRef.current.playbackRate = targetRate;
              }
            };

            if (
              Math.abs(artPlayerRef.current.volume - lastVolumeRef.current) > 0.01
            ) {
              artPlayerRef.current.volume = lastVolumeRef.current;
            }

            // Safari 在 seek 刚发生时立刻恢复 3x，容易卡进持续 seeking 状态。
            // 这里等 seek 稳定后再恢复倍速，避免恢复进度和变速互相打架。
            if (restoredResumeTime && isWebkit && artPlayerRef.current?.video) {
              const video = artPlayerRef.current.video as HTMLVideoElement;
              const applyRateAfterSeek = () => {
                restorePlaybackRate();
              };

              if (video.seeking) {
                const handleSeeked = () => {
                  clearTrackedTimeout(seekedTimeout);
                  applyRateAfterSeek();
                };
                const seekedTimeout = schedulePlayerTimeout(() => {
                  video.removeEventListener('seeked', handleSeeked);
                  applyRateAfterSeek();
                }, 300);

                video.addEventListener(
                  'seeked',
                  handleSeeked,
                  { once: true }
                );
              } else {
                restorePlaybackRate();
              }
            } else {
              restorePlaybackRate();
            }
            syncPlaybackPitch();
            artPlayerRef.current.notice.show = '';
          }, 0);

          // 隐藏换源加载状态
          setIsVideoLoading(false);
          setVideoError(null);
          setCorsFailedUrl(null);
        });

        // 监听视频播放事件，检查是否需要显示播放记录跳转按钮
        artPlayerRef.current.on('video:playing', () => {
          // 检查是否需要显示播放记录跳转按钮
          // 条件：当前播放时间 < 10秒 且 播放记录时间 > 10秒
          const checkPlayRecordJump = async () => {
            try {
              // 短剧不显示"上次播放到"提示（短剧单集太短，提示意义不大）
              if (searchParams.get('duanju') === '1') {
                playRecordJumpInitialCheckRef.current = false;
                return;
              }

              // 仅在进入播放后的首次检查时处理，避免本次会话新生成的记录触发恢复按钮
              if (!playRecordJumpInitialCheckRef.current) {
                return;
              }

              // 如果用户已经关闭过跳转按钮，不再显示
              if (playRecordJumpDismissedRef.current) {
                return;
              }

              const currentTime = artPlayerRef.current?.currentTime || 0;

              // 如果当前播放时间已经大于等于10秒，不显示跳转按钮
              if (currentTime >= 10) {
                // 标记已经进行过首次检查，避免切集后再显示
                playRecordJumpInitialCheckRef.current = false;
                if (playRecordJumpLayerRef.current) {
                  artPlayerRef.current.layers.remove('play-record-jump');
                  playRecordJumpLayerRef.current = null;
                }
                return;
              }

              // 获取播放记录
              const allRecords = await getAllPlayRecords();
              const key = generateStorageKey(
                currentSourceRef.current,
                currentIdRef.current
              );
              const record = allRecords[key];

              if (record) {
                const recordIndex = record.index - 1;
                const recordTime = record.play_time;

                // 检查是否是当前集数且播放记录时间大于10秒且当前时间小于10秒
                if (
                  recordIndex === currentEpisodeIndexRef.current &&
                  recordTime > 10 &&
                  currentTime < 10
                ) {
                  // 如果已经添加过，不重复添加
                  if (playRecordJumpLayerRef.current) {
                    return;
                  }

                  // 标记已经进行过首次检查
                  playRecordJumpInitialCheckRef.current = false;

                  // 格式化时间显示
                  const formatTime = (seconds: number): string => {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    if (h > 0) {
                      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }
                    return `${m}:${s.toString().padStart(2, '0')}`;
                  };

                  // 添加到播放器 layers
                  playRecordJumpLayerRef.current = artPlayerRef.current.layers.add({
                    name: 'play-record-jump',
                    html: `
                      <div id="play-record-jump-container" style="
                        position: absolute;
                        left: 16px;
                        bottom: 60px;
                        z-index: 20;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        background-color: rgba(0, 0, 0, 0.75);
                        border-radius: 6px;
                        color: white;
                        font-size: 14px;
                        font-family: system-ui, -apple-system, sans-serif;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                        backdrop-filter: blur(4px);
                        pointer-events: auto;
                      ">
                        <span style="margin-right: 4px;">
                          上次播放到 ${formatTime(recordTime)}
                        </span>
                        <button id="play-record-jump-btn" style="
                          padding: 4px 12px;
                          background-color: rgba(255, 255, 255, 0.2);
                          border: 1px solid rgba(255, 255, 255, 0.3);
                          border-radius: 4px;
                          color: white;
                          font-size: 13px;
                          cursor: pointer;
                          transition: all 0.2s;
                          font-weight: 500;
                        ">
                          跳转
                        </button>
                        <button id="play-record-dismiss-btn" style="
                          padding: 4px 8px;
                          background-color: transparent;
                          border: none;
                          color: rgba(255, 255, 255, 0.7);
                          font-size: 18px;
                          cursor: pointer;
                          line-height: 1;
                          transition: color 0.2s;
                        " title="关闭">
                          ×
                        </button>
                      </div>
                    `,
                    style: {
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    },
                  });

                  // 绑定事件
                  const jumpBtn = document.getElementById('play-record-jump-btn');
                  const dismissBtn = document.getElementById('play-record-dismiss-btn');

                  if (jumpBtn) {
                    jumpBtn.addEventListener('mouseenter', () => {
                      jumpBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    });
                    jumpBtn.addEventListener('mouseleave', () => {
                      jumpBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    });
                    jumpBtn.addEventListener('click', () => {
                      if (artPlayerRef.current) {
                        artPlayerRef.current.currentTime = recordTime;
                        artPlayerRef.current.notice.show = `已跳转到 ${formatTime(recordTime)}`;
                      }
                      playRecordJumpDismissedRef.current = true;
                      if (playRecordJumpLayerRef.current) {
                        artPlayerRef.current.layers.remove('play-record-jump');
                        playRecordJumpLayerRef.current = null;
                      }
                    });
                  }

                  if (dismissBtn) {
                    dismissBtn.addEventListener('mouseenter', () => {
                      dismissBtn.style.color = 'white';
                    });
                    dismissBtn.addEventListener('mouseleave', () => {
                      dismissBtn.style.color = 'rgba(255, 255, 255, 0.7)';
                    });
                    dismissBtn.addEventListener('click', () => {
                      playRecordJumpDismissedRef.current = true;
                      if (playRecordJumpLayerRef.current) {
                        artPlayerRef.current.layers.remove('play-record-jump');
                        playRecordJumpLayerRef.current = null;
                      }
                    });
                  }

                  console.log('[PlayRecordJump] 显示跳转按钮，当前时间:', currentTime, '记录时间:', recordTime);
                } else {
                  // 不满足显示条件，也标记为已检查过
                  playRecordJumpInitialCheckRef.current = false;
                }
              } else {
                // 没有播放记录，也标记为已检查过
                playRecordJumpInitialCheckRef.current = false;
              }
            } catch (err) {
              console.error('[PlayRecordJump] 检查播放记录失败:', err);
              // 即使出错也标记为已检查过
              playRecordJumpInitialCheckRef.current = false;
            }
          };

          // 延迟检查，确保播放器已经稳定
          setTimeout(checkPlayRecordJump, 500);
        });

        // 监听视频时间更新事件，实现跳过片头片尾
        artPlayerRef.current.on('video:timeupdate', () => {
          if (!skipConfigRef.current.enable) return;

          const currentTime = artPlayerRef.current.currentTime || 0;
          const duration = artPlayerRef.current.duration || 0;
          const now = Date.now();

          // 限制跳过检查频率为1.5秒一次
          if (now - lastSkipCheckRef.current < 1500) return;
          lastSkipCheckRef.current = now;

          // 跳过片头
          if (
            skipConfigRef.current.intro_time > 0 &&
            currentTime < skipConfigRef.current.intro_time
          ) {
            artPlayerRef.current.currentTime = skipConfigRef.current.intro_time;
            artPlayerRef.current.notice.show = `已跳过片头 (${formatTime(
              skipConfigRef.current.intro_time
            )})`;
          }

          // 跳过片尾
          if (
            skipConfigRef.current.outro_time < 0 &&
            duration > 0 &&
            currentTime >
            artPlayerRef.current.duration + skipConfigRef.current.outro_time
          ) {
            if (
              currentEpisodeIndexRef.current <
              (detailRef.current?.episodes?.length || 1) - 1
            ) {
              handleNextEpisode();
            } else {
              artPlayerRef.current.pause();
            }
            artPlayerRef.current.notice.show = `已跳过片尾 (${formatTime(
              skipConfigRef.current.outro_time
            )})`;
          }
        });

        artPlayerRef.current.on('error', (err: any) => {
          console.error('播放器错误:', err);
          // CORS 回退（单文件直链/网盘挂载原生 HLS）：乐观设置的 crossOrigin 在
          // 无 ACAO 的 CDN 上首次播放即失败，去掉 crossOrigin 以 no-cors 重试一次。
          // 必须放在 currentTime 守卫与 HLS 分流之前，覆盖原生 HLS 的 m3u8 失败。
          {
            const fallbackVideo = artPlayerRef.current
              ?.video as HTMLVideoElement | undefined;

          }
          // 如果已经成功播放过一段时间，忽略后续错误（可能是短暂网络波动）
          if (artPlayerRef.current && artPlayerRef.current.currentTime > 0) {
            return;
          }
          // 原生 <video> 播放失败（非 HLS.js 管理的场景，如无后缀的直链）
          // 需要触发播放失败 UI，否则会永远卡在"加载中"
          const currentUrl = artPlayerRef.current?.option?.url || videoUrl;
          const isUsingHls = currentUrl.includes('/api/proxy-m3u8') || currentUrl.includes('/api/proxy/vod/m3u8') || currentUrl.toLowerCase().includes('.m3u8') || currentUrl.toLowerCase().includes('.m3u');
          if (!isUsingHls) {
            // 非 HLS 场景下的原生视频错误，显示错误 UI
            if (proxyAttemptedRef.current) {
              // 代理已经尝试过（走了 415→直连 的路径），直连也失败了，不再提供代理按钮
              setVideoError('视频无法在浏览器中播放（已尝试代理，格式不兼容）');
            } else if (currentSourceRef.current === 'directplay' && !currentUrl.includes('/api/proxy-m3u8')) {
              setCorsFailedUrl(currentUrl);
              setVideoError('视频播放失败');
            } else {
              setVideoError('视频播放失败');
            }
          }
        });

        // 监听视频播放结束事件，自动播放下一集（房员禁用）
        artPlayerRef.current.on('video:ended', () => {
          // 房员禁用自动播放下一集


          const d = detailRef.current;
          const idx = currentEpisodeIndexRef.current;

          if (!d || !d.episodes || idx >= d.episodes.length - 1) {
            return;
          }

          // 查找下一个未被过滤的集数
          let nextIdx = idx + 1;
          while (nextIdx < d.episodes.length) {
            const episodeTitle = d.episodes_titles?.[nextIdx];
            const isFiltered = episodeTitle && isEpisodeFilteredByTitle(episodeTitle);

            if (!isFiltered) {
              setTimeout(() => {
                setCurrentEpisodeIndex(nextIdx);
              }, 1000);
              return;
            }
            nextIdx++;
          }

          // 所有后续集数都被屏蔽
          if (artPlayerRef.current) {
            artPlayerRef.current.notice.show = '后续集数均已屏蔽，已自动停止';
          }
        });

        artPlayerRef.current.on('video:timeupdate', () => {
          const now = Date.now();
          let interval = 5000;
          if (process.env.NEXT_PUBLIC_STORAGE_TYPE === 'upstash') {
            interval = 20000;
          }
          if (now - lastSaveTimeRef.current > interval) {
            saveCurrentPlayProgress();
            lastSaveTimeRef.current = now;
          }

          // 下集预缓冲逻辑
          const nextEpisodePreCacheEnabled = typeof window !== 'undefined'
            ? localStorage.getItem('nextEpisodePreCache') === 'true'
            : false;

          if (nextEpisodePreCacheEnabled) {
            const currentTime = artPlayerRef.current?.currentTime || 0;
            const duration = artPlayerRef.current?.duration || 0;
            const progress = duration > 0 ? currentTime / duration : 0;

            // 检查是否已经到达90%播放进度
            if (duration > 0 && progress >= 0.9 && !nextEpisodePreCacheTriggeredRef.current) {
              // 标记已触发，防止重复执行
              nextEpisodePreCacheTriggeredRef.current = true;

              // 获取下一集信息
              const currentIdx = currentEpisodeIndexRef.current;
              const episodes = detailRef.current?.episodes;

              if (!episodes || currentIdx >= episodes.length - 1) {
                return;
              }

              const nextEpisodeIndex = currentIdx + 1;
              const nextEpisodeUrl = episodes[nextEpisodeIndex];

              if (!nextEpisodeUrl) {
                return;
              }

              // 使用 fetch 预加载资源，利用浏览器缓存
              const preloadNextEpisode = async () => {
                try {
                  // 判断是否是m3u8流
                  if (nextEpisodeUrl.includes('.m3u8') || nextEpisodeUrl.includes('m3u8')) {
                    // 1. 先fetch m3u8文件
                    const m3u8Response = await fetch(nextEpisodeUrl);
                    const m3u8Text = await m3u8Response.text();

                    // 2. 解析m3u8，提取ts分片URL
                    const lines = m3u8Text.split('\n');
                    const tsUrls: string[] = [];
                    const baseUrl = nextEpisodeUrl.substring(0, nextEpisodeUrl.lastIndexOf('/') + 1);

                    for (const line of lines) {
                      const trimmedLine = line.trim();
                      // 跳过注释和空行
                      if (!trimmedLine || trimmedLine.startsWith('#')) {
                        continue;
                      }
                      // 构建完整的ts URL
                      const tsUrl = trimmedLine.startsWith('http')
                        ? trimmedLine
                        : baseUrl + trimmedLine;
                      tsUrls.push(tsUrl);
                    }

                    // 3. 预加载前20个ts分片
                    const maxFragmentsToPreload = Math.min(20, tsUrls.length);

                    for (let i = 0; i < maxFragmentsToPreload; i++) {
                      try {
                        await fetch(tsUrls[i]);
                      } catch (err) { // No recovery is needed here.
 }
                    }
                  }
                } catch (error) { // No recovery is needed here.
 }
              };

              // 异步执行预缓冲
              preloadNextEpisode();
            }
          }

          // 下集弹幕预加载逻辑



        });

        activeHarmonyHlsPlaybackModeRef.current = isHarmonyOS
          ? harmonyHlsPlaybackMode
          : 'hlsjs';
        activeNativeHlsAdBlockRef.current = nativeHlsAdBlockEnabled;


        if (artPlayerRef.current?.video) {
          const exposedVideoUrl =
            isHarmonyOS && harmonyHlsPlaybackMode === 'native'
                ? buildNativeHlsPlaybackUrl(videoUrl)
                : videoUrl;
          ensureVideoSource(
            artPlayerRef.current.video as HTMLVideoElement,
            exposedVideoUrl
          );
        }
      } catch (err) {
        console.error('创建播放器失败:', err);
        setError('播放器初始化失败');
      }
    };

    // 调用异步初始化函数
    initPlayer();
  }, [
    videoUrl,
    loading,
    blockAdEnabled,
    harmonyHlsPlaybackMode,
    nativeHlsAdBlockEnabled,

  ]);

  // 当组件卸载时清理定时器、Wake Lock 和播放器资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }

      // 释放 Wake Lock
      releaseWakeLock();

      // 清理Anime4K
      cleanupAnime4K();

      // 销毁播放器实例
      cleanupPlayer();
    };
  }, []);

  // 初始化加载样式的步骤模型（说明见文件顶部 LOADING_STEP_META 上方注释）
  const loadEntry: LoadingStepKey =
    searchParams.get('source') === 'directplay'
      ? 'direct'
      : searchParams.get('source') && searchParams.get('id')
        ? 'detail'
        : 'search';
  // 优选是否真的会跑：只有开了优选开关，且是搜索入口或带 prefer 标记时才有这一格
  // （见 initAll 里 5636 一带的判定）。带 source+id 的详情入口默认不优选，
  // 于是只剩「获取详情 → 就绪」两格，首格进度条正好落在正中。
  const willPrefer =
    optimizationEnabled &&
    loadEntry !== 'direct' &&
    (loadEntry === 'search' || searchParams.get('prefer') === 'true');
  const loadSteps: LoadingStepKey[] =
    loadEntry === 'direct'
      ? ['direct', 'ready']
      : willPrefer
        ? [loadEntry, 'prefer', 'ready']
        : [loadEntry, 'ready'];
  const activeStepKey: LoadingStepKey =
    loadingStage === 'ready'
      ? 'ready'
      : loadingStage === 'preferring'
        ? 'prefer'
        : loadEntry;
  const activeStepIdx = Math.max(0, loadSteps.indexOf(activeStepKey));
  // 方格/符阵不出现 emoji：阶段语义由描边图标承担，文案只留纯中文
  const plainLoadingMessage = loadingMessage
    .replace(/^[^一-龥]+/, '')
    .replace(/[\s.．。]+$/, '');

  // 播放器遮罩的两步（定义见文件顶部 VIDEO_LOAD_STEPS）
  const videoLoadStepIdx = videoLoadingStage === 'initing' ? 0 : 1;
  const videoLoadMessage =
    videoLoadingStage === 'sourceChanging'
      ? '切换播放源'
      : videoLoadingStage === 'episodeChanging'
        ? '切换剧集'
        : '视频加载中';

  if (loading) {
    return (
      <PageLayout activePath='/play' hideNavigation={isWebFullscreen}>
        {/* fixed 铺满视口：main 在移动端有 3rem 顶距和底部安全区，
            用 min-h-screen 会把内容整体压到视口中心偏下 */}
        <div className='mtv-load-overlay fixed inset-0 flex items-center justify-center pointer-events-none'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 三种加载款式（旧版那一套各页自备） */}
            <LoadingStyle
              steps={loadSteps.map((stepKey) => LOADING_STEP_META[stepKey])}
              activeStepIdx={activeStepIdx}
              message={plainLoadingMessage}
              legacy={
                <>
                  {/* 动画影院图标 */}
                  <div className='relative mb-8'>
                    <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                      <div className='text-white text-4xl'>
                        {loadingStage === 'searching' && '🔍'}
                        {loadingStage === 'preferring' && '⚡'}
                        {loadingStage === 'fetching' && '🎬'}
                        {loadingStage === 'ready' && '✨'}
                      </div>
                      {/* 旋转光环 */}
                      <div className='absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl opacity-20 animate-spin'></div>
                    </div>

                    {/* 浮动粒子效果 */}
                    <div className='absolute top-0 left-0 w-full h-full pointer-events-none'>
                      <div className='absolute top-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-bounce'></div>
                      <div
                        className='absolute top-4 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce'
                        style={{ animationDelay: '0.5s' }}
                      ></div>
                      <div
                        className='absolute bottom-3 left-6 w-1 h-1 bg-lime-400 rounded-full animate-bounce'
                        style={{ animationDelay: '1s' }}
                      ></div>
                    </div>
                  </div>

                  {/* 进度指示器 */}
                  <div className='mb-6 w-80 mx-auto'>
                    <div className='flex justify-center space-x-2 mb-4'>
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-500 ${loadingStage === 'searching' || loadingStage === 'fetching'
                          ? 'bg-green-500 scale-125'
                          : loadingStage === 'preferring' ||
                            loadingStage === 'ready'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                          }`}
                      ></div>
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-500 ${loadingStage === 'preferring'
                          ? 'bg-green-500 scale-125'
                          : loadingStage === 'ready'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                          }`}
                      ></div>
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-500 ${loadingStage === 'ready'
                          ? 'bg-green-500 scale-125'
                          : 'bg-gray-300'
                          }`}
                      ></div>
                    </div>

                    {/* 进度条 */}
                    <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden'>
                      <div
                        className='h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out'
                        style={{
                          width:
                            loadingStage === 'searching' ||
                              loadingStage === 'fetching'
                              ? '33%'
                              : loadingStage === 'preferring'
                                ? '66%'
                                : '100%',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* 加载消息 */}
                  <div className='space-y-2'>
                    <p className='text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse'>
                      {loadingMessage}
                    </p>
                  </div>
                </>
              }
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/play' hideNavigation={isWebFullscreen}>
        <div className='flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-transparent px-4 py-6'>
          <div className='flex w-full flex-col items-center'>
            <div className='w-full max-w-md text-center'>
              {/* 错误图标 */}
              <div className='relative mb-8'>
                {/* 失败态款式（旧版那一套各页自备） */}
                <LoadingErrorStyle
                  steps={loadSteps.map((stepKey) => LOADING_STEP_META[stepKey])}
                  activeStepIdx={activeStepIdx}
                  message={error}
                  legacy={
                    <>
                      <div className='relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 shadow-2xl transition-transform duration-300 hover:scale-105'>
                        <div className='text-4xl text-white'>😵</div>
                        {/* 脉冲效果 */}
                        <div className='absolute -inset-2 animate-pulse rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 opacity-20'></div>
                      </div>

                      {/* 浮动错误粒子 */}
                      <div className='pointer-events-none absolute left-0 top-0 h-full w-full'>
                        <div className='absolute left-2 top-2 h-2 w-2 animate-bounce rounded-full bg-red-400'></div>
                        <div
                          className='absolute right-4 top-4 h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400'
                          style={{ animationDelay: '0.5s' }}
                        ></div>
                        <div
                          className='absolute bottom-3 left-6 h-1 w-1 animate-bounce rounded-full bg-yellow-400'
                          style={{ animationDelay: '1s' }}
                        ></div>
                      </div>
                    </>
                  }
                />
              </div>

              {/* 错误信息 */}
              <div className='mb-8 space-y-4'>
                <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
                  哎呀，出现了一些问题
                </h2>
                <div className='mtv-err-box rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
                  <p className='font-medium text-red-600 dark:text-red-400'>
                    {error}
                  </p>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  请检查网络连接或尝试刷新页面
                </p>
              </div>

              {/* 操作按钮 */}
              <div className='space-y-3'>
                <button
                  onClick={() =>
                    videoTitle
                      ? router.push(`/search?q=${encodeURIComponent(videoTitle)}`)
                      : router.back()
                  }
                  className='flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                >
                  {videoTitle ? (
                    <>
                      <Search className='h-4 w-4 flex-shrink-0' />
                      返回搜索
                    </>
                  ) : (
                    <>
                      <ArrowLeft className='h-4 w-4 flex-shrink-0' />
                      返回上页
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className='flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                >
                  <RefreshCw className='h-4 w-4 flex-shrink-0' />
                  重新尝试
                </button>
              </div>
            </div>

            {hasCompletedSearchRequest && fallbackRecommendations.length > 0 && (
              <div className='mt-4 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white/70 p-3 text-left dark:border-gray-700 dark:bg-gray-800/70 sm:max-w-3xl lg:max-w-5xl'>
                <div className='mb-3 flex items-center gap-2'>
                  <Sparkles className='h-4 w-4 flex-shrink-0 text-amber-500' />
                  <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-200'>
                    也许你想看
                  </h3>
                </div>
                <div
                  ref={fallbackRecommendationsRowRef}
                  className='w-full overflow-x-auto overflow-y-hidden pb-1 cursor-grab active:cursor-grabbing'
                  onWheel={handleFallbackRecommendationsWheel}
                  onMouseDown={handleFallbackRecommendationsMouseDown}
                  onMouseMove={handleFallbackRecommendationsMouseMove}
                  onMouseUp={stopFallbackRecommendationsDragging}
                  onMouseLeave={stopFallbackRecommendationsDragging}
                >
                  <div className='inline-flex gap-2.5 sm:gap-3'>
                    {fallbackRecommendations.map((recommendation) => (
                      <div
                        key={recommendation.key}
                        className='w-[118px] min-w-[118px] flex-shrink-0 sm:w-[150px] sm:min-w-[150px]'
                      >
                        <VideoCard
                          title={recommendation.item.title}
                          query={searchTitle || videoTitle}
                          poster={recommendation.item.poster}
                          episodes={recommendation.episodes}
                          source_names={recommendation.sourceNames}
                          year={recommendation.item.year}
                          douban_id={recommendation.doubanId}
                          from='search'
                          isAggregate
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }


  return (
    <PageLayout activePath='/play' hideNavigation={isWebFullscreen}>
      {/* TMDB背景图 */}
      {tmdbBackdrop && (
        <div
          className='fixed inset-0 z-0'
          style={{
            backgroundImage: `url(${tmdbBackdrop})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(5px) brightness(0.7)',
          }}
        />
      )}
      {/* 弹幕源选择对话框 */}


      <div className='relative z-10 flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20'>
        {/* 第一行：影片标题 */}
        <div className='py-1'>
          <h1 className={`text-xl font-semibold flex items-center gap-2 flex-wrap ${tmdbBackdrop ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
            <span>
              {videoTitle || '影片标题'}
              {shouldShowEpisodeLabel && (
                <span className={tmdbBackdrop ? 'text-white opacity-80' : 'text-gray-500 dark:text-gray-400'}>
                  {` > ${episodeLabel}`}
                </span>
              )}
            </span>
            {/* 完结状态标识 */}
            {detail && totalEpisodes > 1 && (() => {
              const status = getSeriesStatus(detail);
              if (status === 'unknown') return null;

              return (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}
                >
                  {status === 'completed' ? '已完结' : '连载中'}
                </span>
              );
            })()}

          </h1>
        </div>
        {/* 第二行：播放器和选集 */}
        <div className='space-y-2'>
          {/* 折叠控制 - 仅在 lg 及以上屏幕显示 */}
          <div className='hidden lg:flex justify-end'>
            <button
              onClick={() =>
                setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)
              }
              className='group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200'
              title={
                isEpisodeSelectorCollapsed ? '显示选集面板' : '隐藏选集面板'
              }
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isEpisodeSelectorCollapsed ? 'rotate-180' : 'rotate-0'
                  }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                />
              </svg>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isEpisodeSelectorCollapsed ? '显示' : '隐藏'}
              </span>

              {/* 精致的状态指示点 */}
              <div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full transition-all duration-200 ${isEpisodeSelectorCollapsed
                  ? 'bg-orange-400 animate-pulse'
                  : 'bg-green-400'
                  }`}
              ></div>
            </button>
          </div>

          <div
            className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${isEpisodeSelectorCollapsed
              ? 'grid-cols-1'
              : 'grid-cols-1 md:grid-cols-4'
              }`}
          >
            {/* 播放器 */}
            <div
              className={`transition-all duration-300 ease-in-out rounded-xl border border-white/0 dark:border-white/30 flex flex-col ${isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-3'
                }`}
            >
              {/* 播放器容器 */}
              <div className='relative w-full h-[300px] lg:flex-1 lg:min-h-0'>
                <div
                  ref={artRef}
                  className='bg-black w-full h-full rounded-xl overflow-hidden shadow-lg'
                ></div>

                {/* 换源加载蒙层 */}


                {/* 链接刷新提示（右上角，无遮罩） */}


                {/* 弹幕加载蒙层 */}


              </div>

              {/* 第三方应用打开按钮 - 观影室同步状态下隐藏 */}

            </div>

            {/* 选集和换源 - 在移动端始终显示，在 lg 及以上可折叠 */}
            <div
              className={`relative z-10 h-[350px] lg:h-full md:overflow-hidden transition-all duration-300 ease-in-out ${isEpisodeSelectorCollapsed
                ? 'md:col-span-1 lg:hidden lg:opacity-0 lg:scale-95'
                : 'md:col-span-1 lg:opacity-100 lg:scale-100'
                }`}
            >
              <EpisodeSelector
                totalEpisodes={totalEpisodes}
                episodes_titles={detail?.episodes_titles || []}
                richEpisodeNames={richEpisodeNames}
                value={currentEpisodeIndex + 1}
                onChange={handleEpisodeChange}
                onSourceChange={handleSourceChange}

                currentSource={currentSource}
                currentId={currentId}
                episodeProgressContentKey={episodeProgressContentKey || undefined}
                videoTitle={searchTitle || videoTitle}
                availableSources={availableSources}
                sourceSearchLoading={sourceSearchLoading}
                sourceSearchError={sourceSearchError}
                backgroundSourcesLoading={backgroundSourcesLoading}
                precomputedVideoInfo={precomputedVideoInfo}
                useLightTextOnBackdrop={!!tmdbBackdrop}




                episodeFilterConfig={episodeFilterConfig}
                onFilterConfigUpdate={setEpisodeFilterConfig}
                onShowToast={(message, type) => {
                  setToast({ message, type, onClose: () => setToast(null) });
                }}
              />
            </div>
          </div>
        </div>


      </div>

      {/* Toast通知 */}
      {toast && <Toast {...toast} />}



      {/* 下载选集面板 */}


      {/* 弹幕过滤设置对话框 */}


      {/* 快捷键说明弹窗 */}
      {showShortcutDialog && (
        <div
          className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm'
          onClick={() => setShowShortcutDialog(false)}
        >
          <div
            className='relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl shadow-black/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:shadow-black/40'
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='shortcut-dialog-title'
          >
            <div className='absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-green-500/15 via-cyan-500/10 to-transparent pointer-events-none' />
            <div className='relative flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-300'>
                  <Keyboard className='h-5 w-5' />
                </div>
                <div>
                  <h2 id='shortcut-dialog-title' className='text-base font-semibold text-gray-950 dark:text-white'>
                    播放快捷键
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutDialog(false)}
                className='rounded-lg p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                aria-label='关闭快捷键说明'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='relative max-h-[70vh] overflow-y-auto px-5 py-4'>
              <div className='grid gap-3'>
                {PLAY_SHORTCUT_GROUPS.map((group) => (
                  <section
                    key={group.title}
                    className='rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60'
                  >
                    <h3 className='mb-3 text-sm font-medium text-gray-800 dark:text-gray-200'>
                      {group.title}
                    </h3>
                    <div className='space-y-2'>
                      {group.items.map((item) => (
                        <div
                          key={`${group.title}-${item.description}`}
                          className='flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-white dark:hover:bg-gray-700/70'
                        >
                          <div className='flex flex-wrap items-center gap-1.5'>
                            {item.keys.map((key, index) => (
                              <span key={`${item.description}-${key}`} className='flex items-center gap-1.5'>
                                {index > 0 && (
                                  <span className='text-xs text-gray-400 dark:text-gray-500'>+</span>
                                )}
                                <kbd className='min-w-7 rounded-md border border-gray-300 bg-white px-2 py-1 text-center text-xs font-semibold text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:shadow-inner dark:shadow-white/5'>
                                  {key}
                                </kbd>
                              </span>
                            ))}
                          </div>
                          <span className='text-right text-xs text-gray-600 dark:text-gray-300'>
                            {item.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 网盘搜索弹窗 */}


      {/* AI问片面板 */}


      {/* 纠错弹窗 - 仅小雅源显示 */}
      {detail && detail.source === 'xiaoya' && (
        <CorrectDialog
          isOpen={showCorrectDialog}
          onClose={() => setShowCorrectDialog(false)}
          videoKey={`${detail.source}_${detail.id}`}
          currentTitle={detail.title}
          currentVideo={{
            tmdbId: detail.tmdb_id,
            doubanId: detail.douban_id ? String(detail.douban_id) : undefined,
            poster: detail.poster,
            releaseDate: detail.year,
            overview: detail.desc,
            voteAverage: detail.rating,
            mediaType: detail.type_name === '电影' ? 'movie' : 'tv',
          }}
          source="xiaoya"
          onCorrect={() => {
            // 纠错成功后的回调
            handleCorrectSuccess();
          }}
          useDrawer={isLargeScreen}
          drawerWidth='w-[400px]'
        />
      )}

      {/* 详情面板 */}
      {detail && (
        <DetailPanel
          isOpen={showDetailPanel}
          onClose={() => setShowDetailPanel(false)}
          title={detail.title}
          poster={detail.poster}
          doubanId={detail.douban_id && detail.douban_id !== 0
                ? detail.douban_id
                : undefined}
          tmdbId={undefined}
          type={detail.type_name === '电影' ? 'movie' : 'tv'}
          year={detail.year}
          currentEpisode={currentEpisodeIndex + 1}
          cmsData={undefined}
          sourceId={detail.id}
          source={detail.source}
          useDrawer={isLargeScreen}
          drawerWidth='w-[400px]'
        />
      )}
    </PageLayout>
  );
}

// 从 localStorage 读取小雅源的纠错信息


// 应用纠错信息到 detail 对象
const applyCorrection = (detail: SearchResult, correction: any): SearchResult => {
  return {
    ...detail,








  };
};

// 批量应用纠错信息到源列表
const applyCorrectionsToSources = (sources: SearchResult[]): SearchResult[] => {
  return sources.map(source => {

    return source;
  });
};

// FavoriteIcon 组件
const FavoriteIcon = ({ filled }: { filled: boolean }) => {
  if (filled) {
    return (
      <svg
        className='h-7 w-7'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
          fill='#ef4444' /* Tailwind red-500 */
          stroke='#ef4444'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return (
    <Heart className='h-7 w-7 stroke-[1] text-gray-600 dark:text-gray-300' />
  );
};

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayPageClient />
    </Suspense>
  );
}
