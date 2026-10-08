/* eslint-disable no-console,@typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

'use client';

import { Bell, ChevronDown, ChevronUp, CircleHelp, Copy, ExternalLink, Eye, EyeOff, Gauge, Globe, Home, LogOut, Monitor, MoveDown, MoveUp, Package, Puzzle, Router as RouterIcon, Rss, Settings, Shield, Sliders, Smartphone, Star, Tablet, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { SAVE_LIVE_PLAY_RECORDS_KEY } from '@/lib/db.client';
import { CURRENT_VERSION } from '@/lib/version';

import { DeviceManagementPanel } from './DeviceManagementPanel';
import { FavoritesPanel } from './FavoritesPanel';
import { PersonalCenterPanel } from './PersonalCenterPanel';




interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

export const UserMenu: React.FC = () => {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isProfileCenterOpen, setIsProfileCenterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);



  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);

  const [isDeviceManagementOpen, setIsDeviceManagementOpen] = useState(false);
  const [isEcoAppsOpen, setIsEcoAppsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);


  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [storageType, setStorageType] = useState<string>('localstorage');
  const [displayStorageType, setDisplayStorageType] =
    useState<string>('localstorage');
  const [mounted, setMounted] = useState(false);


  // 订阅相关状态
  const [subscribeEnabled, setSubscribeEnabled] = useState(false);

  const [subscribeUrl, setSubscribeUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [orionBaseUrlCopySuccess, setOrionBaseUrlCopySuccess] = useState(false);
  const [tvboxToken, setTvboxToken] = useState('');
  const [isResettingToken, setIsResettingToken] = useState(false);
  const [isLoadingSubscribeUrl, setIsLoadingSubscribeUrl] = useState(false);
  const [subscribeAdFilterEnabled, setSubscribeAdFilterEnabled] =
    useState(false);
  const [subscribeYellowFilterEnabled, setSubscribeYellowFilterEnabled] =
    useState(false);

  // Web 电视扫码登录入口（手机摄像头扫描电视端二维码）






  const [tvAccessTab, setTvAccessTab] = useState<'tvbox' | 'orion' | 'web'>('tvbox');

  // Body 滚动锁定 - 使用 overflow 方式避免布局问题


  // 设置相关状态
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [saveLivePlayRecords, setSaveLivePlayRecords] = useState(false);
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [preferStrategy, setPreferStrategy] = useState<'fast' | 'full'>('fast');
  const [preferMode, setPreferMode] = useState<
    'balanced' | 'resolution' | 'speed'
  >('balanced'); // 优选偏好：综合判定/分辨率优先/网速优先
  const [speedTestTimeout, setSpeedTestTimeout] = useState(4000); // 测速超时时间（毫秒）
  const [fluidSearch, setFluidSearch] = useState(true);
  const [tmdbBackdropDisabled, setTmdbBackdropDisabled] = useState(false);
  const [enableTrailers, setEnableTrailers] = useState(false);
  const [doubanDataSource, setDoubanDataSource] = useState(
    'cmliussss-cdn-tencent'
  );
  const [doubanDataSourceBackup, setDoubanDataSourceBackup] =
    useState('direct');






  const [doubanImageProxyType, setDoubanImageProxyType] = useState(
    'cmliussss-cdn-tencent'
  );
  const [doubanImageProxyTypeBackup, setDoubanImageProxyTypeBackup] =
    useState('server');
  const [doubanImageProxyUrl, setDoubanImageProxyUrl] = useState('');
  const [doubanProxyUrlBackup, setDoubanProxyUrlBackup] = useState('');
  const [doubanImageProxyUrlBackup, setDoubanImageProxyUrlBackup] =
    useState('');
  const [isDoubanDropdownOpen, setIsDoubanDropdownOpen] = useState(false);
  const [isDoubanBackupDropdownOpen, setIsDoubanBackupDropdownOpen] =
    useState(false);


  const [isDoubanImageProxyDropdownOpen, setIsDoubanImageProxyDropdownOpen] =
    useState(false);
  const [
    isDoubanImageProxyBackupDropdownOpen,
    setIsDoubanImageProxyBackupDropdownOpen,
  ] = useState(false);
  const [bufferStrategy, setBufferStrategy] = useState('medium');
  const [nextEpisodePreCache, setNextEpisodePreCache] = useState(true);

  const [disablePlaybackThumbnail, setDisablePlaybackThumbnail] =
    useState(true);
  const [disableEpisodeTitleFetch, setDisableEpisodeTitleFetch] =
    useState(false);




  const [searchTraditionalToSimplified, setSearchTraditionalToSimplified] =
    useState(false);
  const [exactSearch, setExactSearch] = useState(true);






  // 通知设置

















  // 设备管理状态
  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => undefined,
  });

  // 折叠面板状态
  const [isDoubanSectionOpen, setIsDoubanSectionOpen] = useState(false);

  // TMDB 图片设置（默认取站点配置的 TMDB 图片默认地址，用户可本地覆盖）
  const [tmdbImageBaseUrl, setTmdbImageBaseUrl] = useState(
    typeof window !== 'undefined'
      ? ((window as any).RUNTIME_CONFIG?.TMDB_IMAGE_BASE_URL as string) ||
        'https://image.tmdb.org'
      : 'https://image.tmdb.org'
  );
  const [isUsageSectionOpen, setIsUsageSectionOpen] = useState(false);

  const [isBufferSectionOpen, setIsBufferSectionOpen] = useState(false);

  const [isHomepageSectionOpen, setIsHomepageSectionOpen] = useState(false);

  // 本地设置云同步状态






  // 首页模块配置
  interface HomeModule {
    id: string;
    name: string;
    enabled: boolean;
    order: number;
  }

  type HomeBannerHeightScale = '1' | '1.5' | '2';

  const defaultHomeModules: HomeModule[] = [
    { id: 'hotMovies', name: '热门电影', enabled: true, order: 0 },


    { id: 'hotTvShows', name: '热门剧集', enabled: true, order: 3 },
    { id: 'hotVarietyShows', name: '热门综艺', enabled: true, order: 4 },
    { id: 'upcomingContent', name: '即将上映', enabled: true, order: 5 },
  ];

  const [homeModules, setHomeModules] =
    useState<HomeModule[]>(defaultHomeModules);
  const [homeBannerEnabled, setHomeBannerEnabled] = useState(true);
  const [homeBannerHeightScale, setHomeBannerHeightScale] =
    useState<HomeBannerHeightScale>('1');
  const [homeContinueWatchingEnabled, setHomeContinueWatchingEnabled] =
    useState(true);

  const homeBannerHeightOptions: {
    value: HomeBannerHeightScale;
    label: string;
    description: string;
  }[] = [
    { value: '1', label: '标准', description: '1x' },
    { value: '1.5', label: '增高', description: '1.5x' },
    { value: '2', label: '特高', description: '2x' },
  ];

  // 豆瓣数据源选项
  const doubanDataSourceOptions = [
    { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
    { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
  ];



  // 豆瓣图片代理选项
  const doubanImageProxyTypeOptions = [
    { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
    {
      value: 'cmliussss-cdn-tencent',
      label: '豆瓣 CDN By CMLiussss（腾讯云）',
    },
    { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
    { value: 'custom', label: '自定义代理' },
    {
      value: 'direct',
      label: '直连（浏览器直接请求豆瓣，可能需要浏览器插件才能正常显示）',
    },
    {
      value: 'img3',
      label: '豆瓣官方精品 CDN（阿里云，可能需要浏览器插件才能正常显示）',
    },
  ];

  // 缓冲策略选项
  const bufferStrategyOptions = [
    { value: 'low', label: '低缓冲（省流量）' },
    { value: 'medium', label: '中缓冲（推荐）' },
    { value: 'high', label: '高缓冲（流畅播放）' },
    { value: 'ultra', label: '超高缓冲（极速体验）' },
  ];

  // 修改密码相关状态
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 清除弹幕缓存相关状态
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [clearCacheMessage, setClearCacheMessage] = useState<string | null>(
    null
  );


  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 加载未读通知数量


  const formatCacheSize = useCallback((size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }, []);



  // 首次加载时检查未读通知数量（使用全局标记避免多个实例重复请求）




  // 监听通知更新事件


  // 从运行时配置读取订阅是否启用


  // 懒加载订阅 URL - 只在打开订阅面板时请求
  const fetchSubscribeUrl = async () => {
    setIsLoadingSubscribeUrl(true);
    try {
      // 获取用户的 TVBox token
      const response = await fetch('/api/user/tvbox-token');
      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        setTvboxToken(token);

        setSubscribeUrl(
          buildSubscribeUrl(
            token,
            subscribeAdFilterEnabled,
            subscribeYellowFilterEnabled
          )
        );
      }
    } catch (error) {
      console.error('获取订阅URL失败:', error);
    } finally {
      setIsLoadingSubscribeUrl(false);
    }
  };

  // 重置 TVBox token
  const handleResetToken = async () => {
    setConfirmDialog({
      isOpen: true,
      title: '重置订阅Token',
      message: '确定要重置订阅token吗？重置后旧的订阅链接将失效。',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setIsResettingToken(true);

        try {
          const response = await fetch('/api/user/tvbox-token/reset', {
            method: 'POST',
          });

          const messageEl = document.getElementById('tvbox-token-message');
          if (response.ok) {
            const data = await response.json();
            const token = data.token;
            setTvboxToken(token);

            setSubscribeUrl(
              buildSubscribeUrl(
                token,
                subscribeAdFilterEnabled,
                subscribeYellowFilterEnabled
              )
            );

            if (messageEl) {
              messageEl.textContent = '订阅token已重置！';
              messageEl.className =
                'text-xs text-center text-green-600 dark:text-green-400 mt-2';
              messageEl.classList.remove('hidden');
              setTimeout(() => {
                messageEl.classList.add('hidden');
              }, 3000);
            }
          } else {
            const data = await response.json();
            if (messageEl) {
              messageEl.textContent = data.error || '重置失败，请重试';
              messageEl.className =
                'text-xs text-center text-red-600 dark:text-red-400 mt-2';
              messageEl.classList.remove('hidden');
            }
          }
        } catch (error) {
          console.error('重置token失败:', error);
          const messageEl = document.getElementById('tvbox-token-message');
          if (messageEl) {
            messageEl.textContent = '重置失败，请重试';
            messageEl.className =
              'text-xs text-center text-red-600 dark:text-red-400 mt-2';
            messageEl.classList.remove('hidden');
          }
        } finally {
          setIsResettingToken(false);
        }
      },
    });
  };

  const buildSubscribeUrl = (
    token: string,
    adFilter: boolean,
    yellowFilter: boolean
  ) => {
    const currentOrigin = window.location.origin;
    const url = new URL('/api/tvbox/subscribe', currentOrigin);
    url.searchParams.set('token', token);
    if (adFilter) {
      url.searchParams.set('adFilter', 'true');
    }
    if (yellowFilter) {
      url.searchParams.set('yellowFilter', 'true');
    }
    return url.toString();
  };

  // 获取认证信息和存储类型
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = getAuthInfoFromBrowserCookie();
      setAuthInfo(auth);

      const runtimeConfig = (window as any).RUNTIME_CONFIG || {};
      const type = runtimeConfig.STORAGE_TYPE || 'localstorage';
      const displayType = runtimeConfig.DISPLAY_STORAGE_TYPE || type;
      setStorageType(type);
      setDisplayStorageType(displayType);
    }
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch'
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedSaveLivePlayRecords = localStorage.getItem(
        SAVE_LIVE_PLAY_RECORDS_KEY
      );
      if (savedSaveLivePlayRecords !== null) {
        setSaveLivePlayRecords(savedSaveLivePlayRecords === 'true');
      }

      const savedDoubanDataSource = localStorage.getItem('doubanDataSource');
      const defaultDoubanProxyType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
        'cmliussss-cdn-tencent';
      if (savedDoubanDataSource !== null) {
        setDoubanDataSource(savedDoubanDataSource);
      } else if (defaultDoubanProxyType) {
        setDoubanDataSource(defaultDoubanProxyType);
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      const defaultDoubanProxy =
        (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      } else if (defaultDoubanProxy) {
        setDoubanProxyUrl(defaultDoubanProxy);
      }

      const savedDoubanDataSourceBackup = localStorage.getItem(
        'doubanDataSourceBackup'
      );
      setDoubanDataSourceBackup(savedDoubanDataSourceBackup || 'direct');

      const savedDoubanProxyUrlBackup = localStorage.getItem(
        'doubanProxyUrlBackup'
      );
      setDoubanProxyUrlBackup(savedDoubanProxyUrlBackup || '');
















      const savedDoubanImageProxyType = localStorage.getItem(
        'doubanImageProxyType'
      );
      const defaultDoubanImageProxyType =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
        'cmliussss-cdn-tencent';
      if (savedDoubanImageProxyType !== null) {
        setDoubanImageProxyType(savedDoubanImageProxyType);
      } else if (defaultDoubanImageProxyType) {
        setDoubanImageProxyType(defaultDoubanImageProxyType);
      }

      const savedDoubanImageProxyUrl = localStorage.getItem(
        'doubanImageProxyUrl'
      );
      const defaultDoubanImageProxyUrl =
        (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || '';
      if (savedDoubanImageProxyUrl !== null) {
        setDoubanImageProxyUrl(savedDoubanImageProxyUrl);
      } else if (defaultDoubanImageProxyUrl) {
        setDoubanImageProxyUrl(defaultDoubanImageProxyUrl);
      }

      const savedDoubanImageProxyTypeBackup = localStorage.getItem(
        'doubanImageProxyTypeBackup'
      );
      setDoubanImageProxyTypeBackup(
        savedDoubanImageProxyTypeBackup || 'server'
      );

      const savedDoubanImageProxyUrlBackup = localStorage.getItem(
        'doubanImageProxyUrlBackup'
      );
      setDoubanImageProxyUrlBackup(savedDoubanImageProxyUrlBackup || '');

      const savedTmdbImageBaseUrl = localStorage.getItem('tmdbImageBaseUrl');
      if (savedTmdbImageBaseUrl !== null) {
        setTmdbImageBaseUrl(savedTmdbImageBaseUrl);
      }

      const savedEnableOptimization =
        localStorage.getItem('enableOptimization');
      if (savedEnableOptimization !== null) {
        setEnableOptimization(JSON.parse(savedEnableOptimization));
      }

      const savedPreferStrategy = localStorage.getItem('preferStrategy');
      if (savedPreferStrategy === 'fast' || savedPreferStrategy === 'full') {
        setPreferStrategy(savedPreferStrategy);
      }

      const savedPreferMode = localStorage.getItem('preferMode');
      if (
        savedPreferMode === 'balanced' ||
        savedPreferMode === 'resolution' ||
        savedPreferMode === 'speed'
      ) {
        setPreferMode(savedPreferMode);
      }

      const savedSpeedTestTimeout = localStorage.getItem('speedTestTimeout');
      if (savedSpeedTestTimeout !== null) {
        setSpeedTestTimeout(Number(savedSpeedTestTimeout));
      }

      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch =
        (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setFluidSearch(defaultFluidSearch);
      }

      const savedTmdbBackdropDisabled = localStorage.getItem(
        'tmdb_backdrop_disabled'
      );
      if (savedTmdbBackdropDisabled !== null) {
        setTmdbBackdropDisabled(savedTmdbBackdropDisabled === 'true');
      }

      const savedEnableTrailers = localStorage.getItem('enableTrailers');
      if (savedEnableTrailers !== null) {
        setEnableTrailers(savedEnableTrailers === 'true');
      }

      const savedBufferStrategy = localStorage.getItem('bufferStrategy');
      if (savedBufferStrategy !== null) {
        setBufferStrategy(savedBufferStrategy);
      }

      const savedNextEpisodePreCache = localStorage.getItem(
        'nextEpisodePreCache'
      );
      if (savedNextEpisodePreCache !== null) {
        setNextEpisodePreCache(savedNextEpisodePreCache === 'true');
      }




      const savedDisablePlaybackThumbnail = localStorage.getItem(
        'disablePlaybackThumbnail'
      );
      if (savedDisablePlaybackThumbnail !== null) {
        setDisablePlaybackThumbnail(savedDisablePlaybackThumbnail === 'true');
      }

      const savedDisableEpisodeTitleFetch = localStorage.getItem(
        'disableEpisodeTitleFetch'
      );
      if (savedDisableEpisodeTitleFetch !== null) {
        setDisableEpisodeTitleFetch(savedDisableEpisodeTitleFetch === 'true');
      }










      const savedHomeBannerEnabled = localStorage.getItem('homeBannerEnabled');
      if (savedHomeBannerEnabled !== null) {
        setHomeBannerEnabled(savedHomeBannerEnabled === 'true');
      }

      const savedHomeBannerHeightScale = localStorage.getItem(
        'homeBannerHeightScale'
      );
      if (
        savedHomeBannerHeightScale === '1' ||
        savedHomeBannerHeightScale === '1.5' ||
        savedHomeBannerHeightScale === '2'
      ) {
        setHomeBannerHeightScale(savedHomeBannerHeightScale);
      }

      const savedHomeContinueWatchingEnabled = localStorage.getItem(
        'homeContinueWatchingEnabled'
      );
      if (savedHomeContinueWatchingEnabled !== null) {
        setHomeContinueWatchingEnabled(
          savedHomeContinueWatchingEnabled === 'true'
        );
      }

      // 加载首页模块配置
      const savedHomeModules = localStorage.getItem('homeModules');
      if (savedHomeModules !== null) {
        try {
          setHomeModules(JSON.parse(savedHomeModules));
        } catch (error) {
          console.error('解析首页模块配置失败:', error);
        }
      }

      // 加载弹幕繁简转换设置



      // 加载搜索繁体转简体设置
      const savedSearchTraditionalToSimplified = localStorage.getItem(
        'searchTraditionalToSimplified'
      );
      if (savedSearchTraditionalToSimplified !== null) {
        setSearchTraditionalToSimplified(
          savedSearchTraditionalToSimplified === 'true'
        );
      }

      // 加载精确搜索设置
      const savedExactSearch = localStorage.getItem('exactSearch');
      if (savedExactSearch !== null) {
        setExactSearch(savedExactSearch === 'true');
      }

      // 加载最大同时下载限制设置



      // 加载单任务线程数设置



      // 加载分片下载超时设置



      // 加载下载模式设置



      // 加载保存路径设置


    }
  }, []);

  // 加载通知设置




  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64Url = (buffer: ArrayBuffer | null) => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window
      .btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  };

  const isSubscriptionUsingPublicKey = (
    subscription: PushSubscription,
    publicKey: string
  ) => {
    const subscriptionKey = arrayBufferToBase64Url(
      subscription.options?.applicationServerKey || null
    );
    return subscriptionKey === publicKey;
  };

  const waitForServiceWorkerActivation = async (
    registration: ServiceWorkerRegistration
  ) => {
    let pendingWorker = registration.installing || registration.waiting;

    if (!pendingWorker) {

      pendingWorker = registration.installing || registration.waiting;
    }

    // 没有新的 installing/waiting worker 时，说明当前 active registration 可直接使用。
    if (!pendingWorker) {

      throw new Error('Service Worker 注册失败，请刷新页面后重试');
    }

    const activatingWorker = pendingWorker;
    if (activatingWorker.state === 'activated') return registration;

    await new Promise<void>((resolve, reject) => {
      const handleStateChange = () => {
        if (activatingWorker.state === 'activated') {
          activatingWorker.removeEventListener('statechange', handleStateChange);
          resolve();
        } else if (activatingWorker.state === 'redundant') {
          activatingWorker.removeEventListener('statechange', handleStateChange);
          reject(new Error('Service Worker 激活失败，请刷新页面后重试'));
        }
      };

      activatingWorker.addEventListener('statechange', handleStateChange);
      handleStateChange();
    });

    return registration;
  };





  // 保存通知设置


  // 加载设备列表
  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const response = await fetch('/api/auth/devices');
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('加载设备列表失败:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  // 撤销单个设备
  const handleRevokeDevice = async (tokenId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '撤销设备登录',
      message: '确定要撤销该设备的登录吗？',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setRevoking(tokenId);
        try {
          const response = await fetch('/api/auth/devices', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId }),
          });

          if (response.ok) {
            // 撤销成功后不重新加载列表，仅移除当前撤销的设备项
            setDevices((prevDevices) =>
              prevDevices.filter((device) => device.tokenId !== tokenId)
            );
          } else {
            alert('撤销失败，请重试');
          }
        } catch (error) {
          console.error('撤销设备失败:', error);
          alert('撤销失败，请重试');
        } finally {
          setRevoking(null);
        }
      },
    });
  };

  // 撤销所有设备
  const handleRevokeAllDevices = async () => {
    setConfirmDialog({
      isOpen: true,
      title: '登出所有设备',
      message:
        '确定要登出所有设备吗？这将清除所有设备的登录状态（包括当前设备）。',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          const response = await fetch('/api/auth/devices', {
            method: 'POST',
          });

          if (response.ok) {
            // 登出所有设备后，重定向到首页
            window.location.href = '/';
          } else {
            alert('操作失败，请重试');
          }
        } catch (error) {
          console.error('登出所有设备失败:', error);
          alert('操作失败，请重试');
        }
      },
    });
  };

  // 根据设备类型返回对应的图标
  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase();

    if (
      info.includes('mobile') ||
      info.includes('iphone') ||
      info.includes('android')
    ) {
      return Smartphone;
    }

    if (info.includes('tablet') || info.includes('ipad')) {
      return Tablet;
    }

    return Monitor;
  };

  // 点击外部区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-datasource"]')) {
          setIsDoubanDropdownOpen(false);
        }
      }
    };

    if (isDoubanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanBackupDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-datasource-backup"]')) {
          setIsDoubanBackupDropdownOpen(false);
        }
      }
    };

    if (isDoubanBackupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanBackupDropdownOpen]);





  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanImageProxyDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-image-proxy"]')) {
          setIsDoubanImageProxyDropdownOpen(false);
        }
      }
    };

    if (isDoubanImageProxyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanImageProxyDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDoubanImageProxyBackupDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="douban-image-proxy-backup"]')) {
          setIsDoubanImageProxyBackupDropdownOpen(false);
        }
      }
    };

    if (isDoubanImageProxyBackupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDoubanImageProxyBackupDropdownOpen]);



  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('注销请求失败:', error);
    }
    window.location.href = '/';
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    setIsChangePasswordOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCloseChangePassword = () => {
    setIsChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };











  const handleSubscribe = async () => {
    setIsOpen(false);
    setIsSubscribeOpen(true);
    setCopySuccess(false);
    setOrionBaseUrlCopySuccess(false);
    // 懒加载: TVBox 订阅启用时才请求订阅 URL
    if (subscribeEnabled) {
      await fetchSubscribeUrl();
    } else {
      setIsLoadingSubscribeUrl(false);
    }
  };

  const handleCloseSubscribe = () => {
    setIsSubscribeOpen(false);
    setCopySuccess(false);
    setOrionBaseUrlCopySuccess(false);
  };

  const handleCopySubscribeUrl = async () => {
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleCopyOrionBaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setOrionBaseUrlCopySuccess(true);
      setTimeout(() => {
        setOrionBaseUrlCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('复制OrionTV Base URL失败:', error);
    }
  };

  useEffect(() => {
    if (!tvboxToken || !isSubscribeOpen) return;
    setSubscribeUrl(
      buildSubscribeUrl(
        tvboxToken,
        subscribeAdFilterEnabled,
        subscribeYellowFilterEnabled
      )
    );
  }, [
    tvboxToken,
    subscribeAdFilterEnabled,
    subscribeYellowFilterEnabled,
    isSubscribeOpen,
  ]);

  const handleSubmitChangePassword = async () => {
    setPasswordError('');

    // 验证密码
    if (!newPassword) {
      setPasswordError('新密码不得为空');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || '修改密码失败');
        return;
      }

      // 修改成功，关闭弹窗并登出
      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch (error) {
      setPasswordError('网络错误，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    setIsSettingsOpen(true);

  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);

  };

  // 设置相关的处理函数
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleSaveLivePlayRecordsToggle = (value: boolean) => {
    setSaveLivePlayRecords(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVE_LIVE_PLAY_RECORDS_KEY, String(value));
    }
  };

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleOptimizationToggle = (value: boolean) => {
    setEnableOptimization(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableOptimization', JSON.stringify(value));
    }
  };

  const handlePreferStrategyChange = (value: 'fast' | 'full') => {
    setPreferStrategy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferStrategy', value);
    }
  };

  const handlePreferModeChange = (
    value: 'balanced' | 'resolution' | 'speed'
  ) => {
    setPreferMode(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferMode', value);
    }
  };

  const handleSpeedTestTimeoutChange = (value: number) => {
    setSpeedTestTimeout(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('speedTestTimeout', String(value));
    }
  };











  const handleSelectSavePath = async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();

      localStorage.setItem('filesystemSavePath', dirHandle.name);

      // 保存目录句柄到 IndexedDB
      const dbName = 'MoonTVPlus';
      const storeName = 'dirHandles';

      // 使用 Promise 包装 IndexedDB 操作
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, 2); // 使用版本 2，与 download-db.ts 保持一致

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 创建 dirHandles 表（如果不存在）
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }

          // 创建 activeTasks 表（如果不存在）
          if (!db.objectStoreNames.contains('activeTasks')) {
            const activeStore = db.createObjectStore('activeTasks', {
              keyPath: 'id',
            });
            activeStore.createIndex('status', 'status', { unique: false });
            activeStore.createIndex('createdAt', 'createdAt', {
              unique: false,
            });
          }

          // 创建 completedTasks 表（如果不存在）
          if (!db.objectStoreNames.contains('completedTasks')) {
            const completedStore = db.createObjectStore('completedTasks', {
              keyPath: 'id',
            });
            completedStore.createIndex('source', 'source', { unique: false });
            completedStore.createIndex('videoId', 'videoId', { unique: false });
            completedStore.createIndex('completedAt', 'completedAt', {
              unique: false,
            });
            completedStore.createIndex('sourceVideoId', ['source', 'videoId'], {
              unique: false,
            });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(dirHandle, 'downloadDir');

          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };

          putRequest.onerror = () => {
            db.close();
            reject(new Error('保存目录句柄失败'));
          };
        };

        request.onerror = () => {
          reject(new Error('无法打开 IndexedDB'));
        };
      });
    } catch (err) {
      console.error('选择目录失败:', err);
    }
  };

  const handleFluidSearchToggle = (value: boolean) => {
    setFluidSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fluidSearch', JSON.stringify(value));
    }
  };

  const handleTmdbBackdropDisabledToggle = (value: boolean) => {
    setTmdbBackdropDisabled(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tmdb_backdrop_disabled', String(value));
    }
  };

  const handleEnableTrailersToggle = (value: boolean) => {
    setEnableTrailers(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableTrailers', String(value));
    }
  };

  const handleDoubanDataSourceChange = (value: string) => {
    setDoubanDataSource(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataSource', value);
    }
  };

  const handleDoubanDataSourceBackupChange = (value: string) => {
    setDoubanDataSourceBackup(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanDataSourceBackup', value);
    }
  };











  const handleDoubanImageProxyTypeChange = (value: string) => {
    setDoubanImageProxyType(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyType', value);
    }
  };

  const handleDoubanImageProxyTypeBackupChange = (value: string) => {
    setDoubanImageProxyTypeBackup(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyTypeBackup', value);
    }
  };

  const handleDoubanProxyUrlBackupChange = (value: string) => {
    setDoubanProxyUrlBackup(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrlBackup', value);
    }
  };

  const handleDoubanImageProxyUrlChange = (value: string) => {
    setDoubanImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyUrl', value);
    }
  };

  const handleDoubanImageProxyUrlBackupChange = (value: string) => {
    setDoubanImageProxyUrlBackup(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanImageProxyUrlBackup', value);
    }
  };

  const handleTmdbImageBaseUrlChange = (value: string) => {
    setTmdbImageBaseUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tmdbImageBaseUrl', value);
    }
  };

  const handleBufferStrategyChange = (value: string) => {
    setBufferStrategy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bufferStrategy', value);
    }
  };

  // 将滑块值转换为策略值
  const getBufferStrategyFromSlider = (sliderValue: number): string => {
    const strategies = ['low', 'medium', 'high', 'ultra'];
    return strategies[sliderValue] || 'medium';
  };

  // 将策略值转换为滑块值
  const getSliderValueFromStrategy = (strategy: string): number => {
    const strategies = ['low', 'medium', 'high', 'ultra'];
    const index = strategies.indexOf(strategy);
    return index >= 0 ? index : 1; // 默认返回 1 (medium)
  };

  const handleNextEpisodePreCacheToggle = (value: boolean) => {
    setNextEpisodePreCache(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nextEpisodePreCache', String(value));
    }
  };



  const handleDisablePlaybackThumbnailToggle = (value: boolean) => {
    setDisablePlaybackThumbnail(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('disablePlaybackThumbnail', String(value));
    }
  };

  const handleDisableEpisodeTitleFetchToggle = (value: boolean) => {
    setDisableEpisodeTitleFetch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('disableEpisodeTitleFetch', String(value));
    }
  };









  const handleSearchTraditionalToSimplifiedToggle = (value: boolean) => {
    setSearchTraditionalToSimplified(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchTraditionalToSimplified', String(value));
    }
  };

  const handleExactSearchToggle = (value: boolean) => {
    setExactSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('exactSearch', String(value));
    }
  };

  const handleHomeBannerToggle = (value: boolean) => {
    setHomeBannerEnabled(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeBannerEnabled', String(value));
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  const handleHomeBannerHeightScaleChange = (value: HomeBannerHeightScale) => {
    setHomeBannerHeightScale(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeBannerHeightScale', value);
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  const handleHomeContinueWatchingToggle = (value: boolean) => {
    setHomeContinueWatchingEnabled(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeContinueWatchingEnabled', String(value));
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  // 首页模块配置处理函数
  const handleHomeModuleToggle = (id: string, enabled: boolean) => {
    const updatedModules = homeModules.map((module) =>
      module.id === id ? { ...module, enabled } : module
    );
    setHomeModules(updatedModules);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeModules', JSON.stringify(updatedModules));
      // 触发自定义事件通知首页刷新
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  const handleHomeModuleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedModules = [...homeModules];
    const temp = updatedModules[index];
    updatedModules[index] = updatedModules[index - 1];
    updatedModules[index - 1] = temp;
    // 更新order
    updatedModules.forEach((module, idx) => {
      module.order = idx;
    });
    setHomeModules(updatedModules);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeModules', JSON.stringify(updatedModules));
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  const handleHomeModuleMoveDown = (index: number) => {
    if (index === homeModules.length - 1) return;
    const updatedModules = [...homeModules];
    const temp = updatedModules[index];
    updatedModules[index] = updatedModules[index + 1];
    updatedModules[index + 1] = temp;
    // 更新order
    updatedModules.forEach((module, idx) => {
      module.order = idx;
    });
    setHomeModules(updatedModules);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homeModules', JSON.stringify(updatedModules));
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  // 获取感谢信息
  const getThanksInfo = (dataSource: string) => {
    switch (dataSource) {
      case 'cors-proxy-zwei':
        return {
          text: 'Thanks to @Zwei',
          url: 'https://github.com/bestzwei',
        };
      case 'cmliussss-cdn-tencent':
      case 'cmliussss-cdn-ali':
        return {
          text: 'Thanks to @CMLiussss',
          url: 'https://github.com/cmliu',
        };
      default:
        return null;
    }
  };

  const handleResetSettings = () => {
    const defaultDoubanProxyType =
      (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
      'cmliussss-cdn-tencent';
    const defaultDoubanProxy =
      (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '';
    const defaultDoubanImageProxyType =
      (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
      'cmliussss-cdn-tencent';
    const defaultDoubanImageProxyUrl =
      (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || '';
    const defaultFluidSearch =
      (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;

    const defaultAnimeBaseUrl = '';


    setDefaultAggregateSearch(true);
    setSaveLivePlayRecords(false);
    setEnableOptimization(true);
    setPreferStrategy('fast');
    setPreferMode('balanced');
    setFluidSearch(defaultFluidSearch);
    setTmdbBackdropDisabled(false);
    setEnableTrailers(false);
    setDoubanProxyUrl(defaultDoubanProxy);
    setDoubanDataSource(defaultDoubanProxyType);
    setDoubanDataSourceBackup('direct');
    setDoubanProxyUrlBackup('');




    setDoubanImageProxyType(defaultDoubanImageProxyType);
    setDoubanImageProxyUrl(defaultDoubanImageProxyUrl);
    setDoubanImageProxyTypeBackup('server');
    setDoubanImageProxyUrlBackup('');
    setTmdbImageBaseUrl('https://image.tmdb.org');
    setBufferStrategy('medium');
    setNextEpisodePreCache(true);

    setDisablePlaybackThumbnail(true);
    setDisableEpisodeTitleFetch(false);


    setHomeBannerEnabled(true);
    setHomeBannerHeightScale('1');
    setHomeContinueWatchingEnabled(true);
    setHomeModules(defaultHomeModules);

    setSearchTraditionalToSimplified(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem(SAVE_LIVE_PLAY_RECORDS_KEY, 'false');
      localStorage.setItem('enableOptimization', JSON.stringify(true));
      localStorage.setItem('preferStrategy', 'fast');
      localStorage.setItem('preferMode', 'balanced');
      localStorage.setItem('fluidSearch', JSON.stringify(defaultFluidSearch));
      localStorage.setItem('liveDirectConnect', JSON.stringify(false));
      localStorage.setItem('tmdb_backdrop_disabled', 'false');
      localStorage.setItem('enableTrailers', 'false');
      localStorage.setItem('doubanProxyUrl', defaultDoubanProxy);
      localStorage.setItem('doubanDataSource', defaultDoubanProxyType);
      localStorage.setItem('doubanDataSourceBackup', 'direct');
      localStorage.setItem('doubanProxyUrlBackup', '');




      localStorage.setItem('doubanImageProxyType', defaultDoubanImageProxyType);
      localStorage.setItem('doubanImageProxyUrl', defaultDoubanImageProxyUrl);
      localStorage.setItem('doubanImageProxyTypeBackup', 'server');
      localStorage.setItem('doubanImageProxyUrlBackup', '');
      localStorage.setItem('tmdbImageBaseUrl', 'https://image.tmdb.org');
      localStorage.setItem('bufferStrategy', 'medium');
      localStorage.setItem('nextEpisodePreCache', 'true');
      localStorage.setItem('nextEpisodeDanmakuPreload', 'true');
      localStorage.setItem('disablePlaybackThumbnail', 'true');
      localStorage.setItem('disableEpisodeTitleFetch', 'false');
      localStorage.setItem(
        'disableAutoLoadDanmaku',
        String(!false)
      );
      localStorage.setItem('danmakuMaxCount', '5000');
      localStorage.setItem('danmaku_heatmap_disabled', 'false');
      localStorage.setItem('homeBannerEnabled', 'true');
      localStorage.setItem('homeBannerHeightScale', '1');
      localStorage.setItem('homeContinueWatchingEnabled', 'true');
      localStorage.setItem('homeModules', JSON.stringify(defaultHomeModules));
      localStorage.setItem('danmakuTraditionalToSimplified', 'false');
      localStorage.setItem('searchTraditionalToSimplified', 'false');
      window.dispatchEvent(new CustomEvent('homeModulesUpdated'));
    }
  };

  // ---------- 本地设置云同步 ----------

  // 初始化：读取根布局注入的全局模式


  // 从 localStorage 读取白名单键的当前快照（仅含已设置的键）


  // 把单个键重置为「未设置」：删除 localStorage 并将组件状态恢复为默认值
  const resetKeyToDefault = (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
    switch (key) {
      case 'defaultAggregateSearch':
        setDefaultAggregateSearch(true);
        break;
      case 'saveLivePlayRecords':
        setSaveLivePlayRecords(false);
        break;
      case 'enableOptimization':
        setEnableOptimization(true);
        break;
      case 'preferStrategy':
        setPreferStrategy('fast');
        break;
      case 'preferMode':
        setPreferMode('balanced');
        break;
      case 'speedTestTimeout':
        setSpeedTestTimeout(4000);
        break;
      case 'maxConcurrentDownloads':

        break;
      case 'downloadThreadsPerTask':

        break;
      case 'downloadSegmentTimeout':

        break;
      case 'downloadMode':

        break;
      case 'filesystemSavePath':

        break;
      case 'fluidSearch':
        setFluidSearch(
          typeof window === 'undefined' ||
            (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false
        );
        break;
      case 'tmdb_backdrop_disabled':
        setTmdbBackdropDisabled(false);
        break;
      case 'enableTrailers':
        setEnableTrailers(false);
        break;
      case 'doubanProxyUrl':
        setDoubanProxyUrl((window as any).RUNTIME_CONFIG?.DOUBAN_PROXY || '');
        break;
      case 'doubanDataSource':
        setDoubanDataSource(
          (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
            'cmliussss-cdn-tencent'
        );
        break;
      case 'doubanDataSourceBackup':
        setDoubanDataSourceBackup('direct');
        break;
      case 'doubanProxyUrlBackup':
        setDoubanProxyUrlBackup('');
        break;
      case 'animeDataSource':

        break;
      case 'animeDataSourceBackup':

        break;
      case 'animeCustomBaseUrl':

        break;
      case 'animeImageBaseUrl':

        break;
      case 'doubanImageProxyType':
        setDoubanImageProxyType(
          (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
            'cmliussss-cdn-tencent'
        );
        break;
      case 'doubanImageProxyUrl':
        setDoubanImageProxyUrl(
          (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY || ''
        );
        break;
      case 'doubanImageProxyTypeBackup':
        setDoubanImageProxyTypeBackup('server');
        break;
      case 'doubanImageProxyUrlBackup':
        setDoubanImageProxyUrlBackup('');
        break;
      case 'tmdbImageBaseUrl':
        setTmdbImageBaseUrl(
          (window as any).RUNTIME_CONFIG?.TMDB_IMAGE_BASE_URL ||
            'https://image.tmdb.org'
        );
        break;
      case 'bufferStrategy':
        setBufferStrategy('medium');
        break;
      case 'nextEpisodePreCache':
        setNextEpisodePreCache(true);
        break;
      case 'nextEpisodeDanmakuPreload':

        break;
      case 'disablePlaybackThumbnail':
        setDisablePlaybackThumbnail(true);
        break;
      case 'disableEpisodeTitleFetch':
        setDisableEpisodeTitleFetch(false);
        break;
      case 'disableAutoLoadDanmaku':

        break;
      case 'danmakuMaxCount':

        break;
      case 'danmaku_heatmap_disabled':

        break;
      case 'homeBannerEnabled':
        setHomeBannerEnabled(true);
        break;
      case 'homeBannerHeightScale':
        setHomeBannerHeightScale('1');
        break;
      case 'homeContinueWatchingEnabled':
        setHomeContinueWatchingEnabled(true);
        break;
      case 'homeModules':
        setHomeModules(defaultHomeModules);
        break;
      case 'danmakuTraditionalToSimplified':

        break;
      case 'searchTraditionalToSimplified':
        setSearchTraditionalToSimplified(false);
        break;
      case 'exactSearch':
        setExactSearch(true);
        break;
      default:
        break;
    }
  };

  // 把云端 payload 写回 localStorage（不触发服务端，仅本地生效）


  // 应用远端 payload：写 localStorage + 广播事件，让所有 UserMenu 实例同步状态


  // 监听其他实例的恢复广播，同步本实例状态


  // 云同步结果以 Toast 展示


  // 从云端拉取副本（自动模式进入网站时、手动恢复时调用）


  // 上传本地设置到云端（手动备份 / 自动静默同步共用）


  // 手动恢复按钮：先确认再拉取


  // 自动模式：关闭本地设置面板时，把本地设置同步到云端
  const prevSettingsOpenRef = useRef(false);



  // 清除弹幕缓存


  // 检查是否显示管理面板按钮
  const showAdminPanel =
    (authInfo?.role === 'owner' || authInfo?.role === 'admin') &&
    storageType !== 'localstorage';

  // 检查是否显示离线下载按钮


  // 检查是否显示修改密码按钮
  const showChangePassword =
    authInfo?.role !== 'owner' && storageType !== 'localstorage';

  // 角色中文映射
  const getRoleText = (role?: string) => {
    switch (role) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      case 'user':
        return '用户';
      default:
        return '';
    }
  };

  const currentUsername = authInfo?.username || 'default';
  const currentRole = authInfo?.role || 'user';
  const currentRoleText = getRoleText(currentRole);
  const shouldShowRoleBadge = currentRole !== 'user';
  const avatarText = currentUsername.trim().charAt(0).toUpperCase() || 'D';

  const roleBadgeClassName =
    currentRole === 'owner'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      : currentRole === 'admin'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';

  const handleOpenProfileCenter = () => {
    setIsOpen(false);
    setIsProfileCenterOpen(true);
  };

  // 菜单面板内容
  const menuPanel = (
    <>
      {/* 背景遮罩 - 普通菜单无需模糊 */}
      <div
        className='fixed inset-0 bg-transparent z-[1000]'
        onClick={handleCloseMenu}
      />

      {/* 菜单面板 */}
      <div className='fixed top-14 right-4 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-[1001] border border-gray-200/50 dark:border-gray-700/50 overflow-hidden select-none'>
        {/* 用户信息区域 */}
        <div className='px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50'>
          <div className='flex items-start justify-between gap-3'>
            <button
              onClick={handleOpenProfileCenter}
              className='flex items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-white/70 dark:hover:bg-gray-700/40 transition-colors'
            >
              <div className='relative flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white shadow-sm'>
                <span>{avatarText}</span>
                {shouldShowRoleBadge && (
                  <span
                    className={`absolute left-1/2 top-[calc(100%-6px)] z-10 -translate-x-1/2 inline-flex min-w-[26px] items-center justify-center whitespace-nowrap rounded-full px-1.5 py-[2px] text-[8px] leading-none font-medium shadow-sm ${roleBadgeClassName}`}
                  >
                    {currentRoleText}
                  </span>
                )}
              </div>
              <div className='min-w-0'>
                <span className='block max-w-[84px] truncate text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none'>
                  {currentUsername}
                </span>
              </div>
            </button>

            <div className='pt-1 text-right'>
              <div className='text-[10px] text-gray-400 dark:text-gray-500'>
                <div>数据存储</div>
                <div className='mt-0.5'>
                  {displayStorageType === 'localstorage'
                    ? '本地'
                    : displayStorageType}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <div className='py-1'>
          {/* 通知按钮 */}


          {/* 我的收藏按钮 */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsFavoritesPanelOpen(true);
            }}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm relative'
          >
            <Star className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>我的收藏</span>
          </button>

          {/* 设置按钮 */}
          <button
            onClick={handleSettings}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Settings className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>设置</span>
          </button>

          {/* 管理面板按钮 */}
          {showAdminPanel && (
            <button
              onClick={handleAdminPanel}
              className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
            >
              <Shield className='w-4 h-4 text-gray-500 dark:text-gray-400' />
              <span className='font-medium'>管理面板</span>
            </button>
          )}

          {/* 离线下载按钮 */}


          {/* TVBox 订阅按钮 */}
          <button
            onClick={handleSubscribe}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Monitor className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>TVBox 订阅</span>
          </button>

          {/* 生态应用按钮 */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsEcoAppsOpen(true);
            }}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
          >
            <Package className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            <span className='font-medium'>生态应用</span>
          </button>

          {/* 分割线 */}
          <div className='my-1 border-t border-gray-200 dark:border-gray-700'></div>

          {/* 登出按钮 */}
          <button
            onClick={handleLogout}
            className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm'
          >
            <LogOut className='w-4 h-4' />
            <span className='font-medium'>登出</span>
          </button>

          {/* 分割线 */}
          <div className='my-1 border-t border-gray-200 dark:border-gray-700'></div>

          {/* 版本信息 */}
          <button
            onClick={() => {

              handleCloseMenu();
            }}
            className='w-full px-3 py-2 text-center flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-xs'
          >
            <div className='flex items-center gap-1'>
              <span className='font-mono'>v{CURRENT_VERSION}</span>

            </div>
          </button>
        </div>
      </div>
    </>
  );

  // 设置面板内容
  const settingsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={handleCloseSettings}
        onTouchMove={(e) => {
          // 只阻止滚动，允许其他触摸事件
          e.preventDefault();
        }}
        onWheel={(e) => {
          // 阻止滚轮滚动
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 设置面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] flex flex-col'>
        {/* 内容容器 - 独立的滚动区域 */}
        <div
          className='flex-1 px-4 py-6 md:p-6 overflow-y-auto'
          data-panel-content
          style={{
            touchAction: 'pan-y', // 只允许垂直滚动
            overscrollBehavior: 'contain', // 防止滚动冒泡
          }}
        >
          {/* 标题栏 */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-3'>
              <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                本地设置
              </h3>
              <button
                onClick={handleResetSettings}
                className='px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                title='重置为默认设置'
              >
                恢复默认
              </button>
              {/* 云备份：仅手动模式显示 */}

            </div>
            <button
              onClick={handleCloseSettings}
              className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              aria-label='Close'
            >
              <X className='w-full h-full' />
            </button>
          </div>

          {/* 设置项 */}
          <div className='space-y-3 md:space-y-4'>
            {/* 豆瓣设置 */}
            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>
              <button
                onClick={() => setIsDoubanSectionOpen(!isDoubanSectionOpen)}
                className='w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <Globe className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200'>
                    数据源设置
                  </h3>
                </div>
                {isDoubanSectionOpen ? (
                  <ChevronUp className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                )}
              </button>

            </div>

            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>
              <button
                onClick={() => setIsUsageSectionOpen(!isUsageSectionOpen)}
                className='w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <Sliders className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200'>
                    通用设置
                  </h3>
                </div>
                {isUsageSectionOpen ? (
                  <ChevronUp className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                )}
              </button>
              {isUsageSectionOpen && (
                <div className='p-3 md:p-4 space-y-4 md:space-y-6'>
                  {/* 默认聚合搜索结果 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        默认聚合搜索结果
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        搜索时默认按标题和年份聚合显示结果
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={defaultAggregateSearch}
                          onChange={(e) =>
                            handleAggregateToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 优选和测速 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        优选和测速
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        如出现播放器劫持问题可关闭
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={enableOptimization}
                          onChange={(e) =>
                            handleOptimizationToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 测速超时设置 */}
                  {enableOptimization && (
                    <div className='ml-4 mt-2 space-y-2'>
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-3'>
                          <span className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400'>
                            优选策略
                            <button
                              type='button'
                              className='group relative inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 dark:text-gray-500 dark:hover:text-gray-300'
                              aria-label='优选策略说明'
                            >
                              <CircleHelp className='h-3.5 w-3.5' />
                              <span className='pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus:block dark:bg-gray-700'>
                                快速策略：快速优选高权重播放源
                                <br />
                                全量策略：全量优选全部源
                              </span>
                            </button>
                          </span>
                          <div className='inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800'>
                            <button
                              type='button'
                              onClick={() => handlePreferStrategyChange('fast')}
                              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                                preferStrategy === 'fast'
                                  ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >
                              快速优选
                            </button>
                            <button
                              type='button'
                              onClick={() => handlePreferStrategyChange('full')}
                              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                                preferStrategy === 'full'
                                  ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >
                              全量优选
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                          <span className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400'>
                            优选偏好
                            <button
                              type='button'
                              className='group relative inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 dark:text-gray-500 dark:hover:text-gray-300'
                              aria-label='优选偏好说明'
                            >
                              <CircleHelp className='h-3.5 w-3.5' />
                              <span className='pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus:block dark:bg-gray-700'>
                                综合判定：分辨率与网速均衡评分
                                <br />
                                分辨率优先：优选时给分辨率加权重
                                <br />
                                网速优先：优选时给网速加权重
                              </span>
                            </button>
                          </span>
                          <div className='flex w-full rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800 sm:inline-flex sm:w-auto'>
                            <button
                              type='button'
                              onClick={() => handlePreferModeChange('balanced')}
                              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${
                                preferMode === 'balanced'
                                  ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >
                              综合判定
                            </button>
                            <button
                              type='button'
                              onClick={() =>
                                handlePreferModeChange('resolution')
                              }
                              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${
                                preferMode === 'resolution'
                                  ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >
                              分辨率优先
                            </button>
                            <button
                              type='button'
                              onClick={() => handlePreferModeChange('speed')}
                              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${
                                preferMode === 'speed'
                                  ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                              }`}
                            >
                              网速优先
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-gray-600 dark:text-gray-400'>
                          换源面板测速超时
                        </span>
                        <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                          {speedTestTimeout / 1000}秒
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <input
                          type='range'
                          min='4000'
                          max='30000'
                          step='1000'
                          value={speedTestTimeout}
                          onChange={(e) =>
                            handleSpeedTestTimeoutChange(Number(e.target.value))
                          }
                          className='flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700'
                          style={{
                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${
                              ((speedTestTimeout - 4000) / (30000 - 4000)) * 100
                            }%, #e5e7eb ${
                              ((speedTestTimeout - 4000) / (30000 - 4000)) * 100
                            }%, #e5e7eb 100%)`,
                          }}
                        />
                      </div>
                      <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
                        <button
                          onClick={() => handleSpeedTestTimeoutChange(4000)}
                          className={`px-2 py-0.5 rounded ${
                            speedTestTimeout === 4000
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          4秒
                        </button>
                        <button
                          onClick={() => handleSpeedTestTimeoutChange(10000)}
                          className={`px-2 py-0.5 rounded ${
                            speedTestTimeout === 10000
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          10秒
                        </button>
                        <button
                          onClick={() => handleSpeedTestTimeoutChange(20000)}
                          className={`px-2 py-0.5 rounded ${
                            speedTestTimeout === 20000
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          20秒
                        </button>
                        <button
                          onClick={() => handleSpeedTestTimeoutChange(30000)}
                          className={`px-2 py-0.5 rounded ${
                            speedTestTimeout === 30000
                              ? 'bg-green-500 text-white'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          30秒
                        </button>
                      </div>
                      <p className='text-xs text-gray-500 dark:text-gray-400 italic'>
                        注：此设置仅对换源面板测速生效，优选播放源时仍使用4秒超时
                      </p>
                    </div>
                  )}

                  {/* 流式搜索 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        流式搜索输出
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        启用搜索结果实时流式输出，关闭后使用传统一次性搜索
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={fluidSearch}
                          onChange={(e) =>
                            handleFluidSearchToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 禁用背景图渲染 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        禁用背景图渲染
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        关闭播放页面的TMDB背景图显示（需手动刷新页面生效）
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={tmdbBackdropDisabled}
                          onChange={(e) =>
                            handleTmdbBackdropDisabledToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 启用预告片 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        首页预告片
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        在首页轮播图中显示视频预告片（需刷新页面生效）
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={enableTrailers}
                          onChange={(e) =>
                            handleEnableTrailersToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 搜索繁体转简体 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        搜索繁体转简体
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        搜索时自动将繁体中文转换为简体中文
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={searchTraditionalToSimplified}
                          onChange={(e) =>
                            handleSearchTraditionalToSimplifiedToggle(
                              e.target.checked
                            )
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 精确搜索 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        精确搜索
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        开启后，搜索结果将过滤掉不包含搜索词的内容
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={exactSearch}
                          onChange={(e) =>
                            handleExactSearchToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 直播播放记录 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        保存直播的播放记录
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        开启后将保存直播频道观看记录
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={saveLivePlayRecords}
                          onChange={(e) =>
                            handleSaveLivePlayRecordsToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                </div>
              )}
            </div>

            {/* 下载设置 */}
            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>


            </div>

            {/* 播放设置 */}
            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>
              <button
                onClick={() => setIsBufferSectionOpen(!isBufferSectionOpen)}
                className='w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <Gauge className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200'>
                    播放设置
                  </h3>
                </div>
                {isBufferSectionOpen ? (
                  <ChevronUp className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                )}
              </button>
              {isBufferSectionOpen && (
                <div className='p-3 md:p-4 space-y-4 md:space-y-6'>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      调整播放器相关设置（仅在播放页面生效）
                    </p>
                  </div>

                  {/* 缓冲策略 */}
                  <div className='space-y-3'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        缓冲策略
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        设置视频缓冲块大小，影响播放流畅度和流量消耗
                      </p>
                    </div>

                    {/* 滑块控件 */}
                    <div className='space-y-2'>
                      <input
                        type='range'
                        min='0'
                        max='3'
                        step='1'
                        value={getSliderValueFromStrategy(bufferStrategy)}
                        onChange={(e) => {
                          const sliderValue = parseInt(e.target.value);
                          const strategy =
                            getBufferStrategyFromSlider(sliderValue);
                          handleBufferStrategyChange(strategy);
                        }}
                        className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500'
                        style={{
                          background: `linear-gradient(to right, rgb(34 197 94) 0%, rgb(34 197 94) ${
                            (getSliderValueFromStrategy(bufferStrategy) / 3) *
                            100
                          }%, rgb(229 231 235) ${
                            (getSliderValueFromStrategy(bufferStrategy) / 3) *
                            100
                          }%, rgb(229 231 235) 100%)`,
                        }}
                      />

                      {/* 标签显示 */}
                      <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1'>
                        <span
                          className={
                            bufferStrategy === 'low'
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : ''
                          }
                        >
                          低缓冲
                        </span>
                        <span
                          className={
                            bufferStrategy === 'medium'
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : ''
                          }
                        >
                          中缓冲
                        </span>
                        <span
                          className={
                            bufferStrategy === 'high'
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : ''
                          }
                        >
                          高缓冲
                        </span>
                        <span
                          className={
                            bufferStrategy === 'ultra'
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : ''
                          }
                        >
                          超高缓冲
                        </span>
                      </div>

                      {/* 当前选择的说明 */}
                      <div className='text-center text-sm font-medium text-gray-700 dark:text-gray-300 mt-2'>
                        {
                          bufferStrategyOptions.find(
                            (option) => option.value === bufferStrategy
                          )?.label
                        }
                      </div>
                    </div>
                  </div>

                  {/* 下集预缓冲 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        下集预缓冲
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        播放进度达到90%时，自动预缓冲下一集内容
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={nextEpisodePreCache}
                          onChange={(e) =>
                            handleNextEpisodePreCacheToggle(e.target.checked)
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 禁用播放预览图 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        禁用播放预览图
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        关闭后不再生成进度条悬停预览图。生成预览图需完整抽帧整个视频，流量开销较大，修改后重新进入播放页生效
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={disablePlaybackThumbnail}
                          onChange={(e) =>
                            handleDisablePlaybackThumbnailToggle(
                              e.target.checked
                            )
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>

                  {/* 禁用集数标题获取并切换 */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        禁用集数标题获取并切换
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        开启后不再获取分集标题，选集面板保持数字网格视图，不自动切换为列表视图
                      </p>
                    </div>
                    <label className='flex items-center cursor-pointer'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={disableEpisodeTitleFetch}
                          onChange={(e) =>
                            handleDisableEpisodeTitleFetchToggle(
                              e.target.checked
                            )
                          }
                        />
                        <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                        <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 弹幕设置 */}
            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>


            </div>

            {/* 首页设置 */}
            <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible'>
              <button
                onClick={() => setIsHomepageSectionOpen(!isHomepageSectionOpen)}
                className='w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <Home className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200'>
                    首页设置
                  </h3>
                </div>
                {isHomepageSectionOpen ? (
                  <ChevronUp className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                )}
              </button>
              {isHomepageSectionOpen && (
                <div className='p-3 md:p-4 space-y-4 md:space-y-6'>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mb-3'>
                      配置首页轮播图显示效果，以及首页模块布局
                    </p>
                  </div>

                  {/* 轮播图配置 */}
                  <div className='space-y-2'>
                    <div>
                      <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200'>
                        轮播图配置
                      </h4>
                    </div>
                    <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3'>
                      <div>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          轮播图高度
                        </div>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                          调整首页轮播图显示高度
                        </p>
                      </div>
                      <div className='grid grid-cols-3 gap-2'>
                        {homeBannerHeightOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() =>
                              handleHomeBannerHeightScaleChange(option.value)
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              homeBannerHeightScale === option.value
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={`${option.label}（${option.description}）`}
                          >
                            <span>{option.label}</span>
                            <span
                              className={`ml-1 text-xs ${
                                homeBannerHeightScale === option.value
                                  ? 'text-blue-100'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {option.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 模块显示与排序 */}
                  <div className='space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3'>
                    <div>
                      <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200'>
                        模块显示与排序
                      </h4>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        控制首页组件和内容模块的显示/隐藏与顺序
                      </p>
                    </div>
                    <div className='flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <button
                        onClick={() =>
                          handleHomeBannerToggle(!homeBannerEnabled)
                        }
                        className='flex-shrink-0'
                        title={homeBannerEnabled ? '点击隐藏' : '点击显示'}
                      >
                        {homeBannerEnabled ? (
                          <Eye className='w-5 h-5 text-green-600 dark:text-green-400' />
                        ) : (
                          <EyeOff className='w-5 h-5 text-gray-400 dark:text-gray-500' />
                        )}
                      </button>
                      <div className='flex-1'>
                        <span
                          className={`text-sm font-medium ${
                            homeBannerEnabled
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          首页轮播图
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <button
                        onClick={() =>
                          handleHomeContinueWatchingToggle(
                            !homeContinueWatchingEnabled
                          )
                        }
                        className='flex-shrink-0'
                        title={
                          homeContinueWatchingEnabled ? '点击隐藏' : '点击显示'
                        }
                      >
                        {homeContinueWatchingEnabled ? (
                          <Eye className='w-5 h-5 text-green-600 dark:text-green-400' />
                        ) : (
                          <EyeOff className='w-5 h-5 text-gray-400 dark:text-gray-500' />
                        )}
                      </button>
                      <div className='flex-1'>
                        <span
                          className={`text-sm font-medium ${
                            homeContinueWatchingEnabled
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          继续观看
                        </span>
                      </div>
                    </div>

                    {/* 模块列表 */}
                    <div className='space-y-2'>
                      {homeModules.map((module, index) => (
                        <div
                          key={module.id}
                          className='flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
                        >
                          {/* 左侧：显示/隐藏开关 */}
                          <button
                            onClick={() =>
                              handleHomeModuleToggle(module.id, !module.enabled)
                            }
                            className='flex-shrink-0'
                            title={module.enabled ? '点击隐藏' : '点击显示'}
                          >
                            {module.enabled ? (
                              <Eye className='w-5 h-5 text-green-600 dark:text-green-400' />
                            ) : (
                              <EyeOff className='w-5 h-5 text-gray-400 dark:text-gray-500' />
                            )}
                          </button>

                          {/* 中间：模块名称 */}
                          <div className='flex-1'>
                            <span
                              className={`text-sm font-medium ${
                                module.enabled
                                  ? 'text-gray-900 dark:text-gray-100'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {module.name}
                            </span>
                          </div>

                          {/* 右侧：上下移动按钮 */}
                          <div className='flex gap-1'>
                            <button
                              onClick={() => handleHomeModuleMoveUp(index)}
                              disabled={index === 0}
                              className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                              title='上移'
                            >
                              <MoveUp className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                            </button>
                            <button
                              onClick={() => handleHomeModuleMoveDown(index)}
                              disabled={index === homeModules.length - 1}
                              className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                              title='下移'
                            >
                              <MoveDown className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 恢复默认按钮 */}
                  <button
                    onClick={() => {
                      setHomeModules(defaultHomeModules);
                      setHomeBannerEnabled(true);
                      setHomeBannerHeightScale('1');
                      setHomeContinueWatchingEnabled(true);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(
                          'homeModules',
                          JSON.stringify(defaultHomeModules)
                        );
                        localStorage.setItem('homeBannerEnabled', 'true');
                        localStorage.setItem('homeBannerHeightScale', '1');
                        localStorage.setItem(
                          'homeContinueWatchingEnabled',
                          'true'
                        );
                        window.dispatchEvent(
                          new CustomEvent('homeModulesUpdated')
                        );
                      }
                    }}
                    className='w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors'
                  >
                    恢复默认配置
                  </button>

                  {/* 提示信息 */}
                  <div className='text-xs text-gray-500 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                    <p>
                      💡
                      提示：点击眼睛图标可显示/隐藏模块，使用箭头按钮调整模块顺序
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部说明 */}
          <div className='mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
              这些设置保存在本地浏览器中
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // TVBox 订阅面板内容
  const subscribePanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]'
        onClick={handleCloseSubscribe}
        onTouchMove={(e) => {
          e.preventDefault();
        }}
        onWheel={(e) => {
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* TVBox 订阅面板 */}
      <div className='fixed top-1/2 left-1/2 z-[1001] max-h-[92vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-slate-950'>
        <div
          className='max-h-[92vh] overflow-y-auto p-6 sm:p-7'
          data-panel-content
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto',
          }}
        >
          {(
            <>
          {/* 标题栏 */}
          <div className='mb-6 flex items-start justify-between gap-4'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400'>
                <Monitor className='h-4 w-4' />
                TV ACCESS
              </div>
              <h3 className='mt-3 text-2xl font-black text-slate-900 dark:text-slate-50'>
                TVBox 订阅
              </h3>
            </div>
            <button
              onClick={handleCloseSubscribe}
              className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:hover:bg-white/10 dark:hover:text-white'
              aria-label='Close'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='mb-5 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-white/10'>
            {[
              { key: 'tvbox' as const, label: 'TVBox 订阅', icon: Rss },

              { key: 'web' as const, label: 'Web 电视', icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              const active = tvAccessTab === item.key;
              return null;
            })}
          </div>

          {tvAccessTab === 'tvbox' && (
            <section className='rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/25'>
                    <Rss className='h-5 w-5' />
                  </div>
                  <div>
                    <h4 className='text-lg font-black text-slate-900 dark:text-slate-100'>
                      TVBox 订阅
                    </h4>
                    <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                      复制订阅链接到 TVBox 使用
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    subscribeEnabled
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                  }`}
                >
                  {subscribeEnabled ? '已启用' : '未启用'}
                </span>
              </div>

              {!subscribeEnabled ? (
                <div className='mt-5 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'>
                  TVBox 订阅功能未启用
                </div>
              ) : isLoadingSubscribeUrl ? (
                <div className='mt-5 space-y-3'>
                  <div className='h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10' />
                  <div className='h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10' />
                  <div className='h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10' />
                </div>
              ) : (
                <div className='mt-5 space-y-4'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <button
                      type='button'
                      onClick={() => setSubscribeAdFilterEnabled((prev) => !prev)}
                      className='flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-green-400 dark:border-white/10 dark:bg-slate-900/70'
                    >
                      <div>
                        <div className='text-sm font-bold text-slate-800 dark:text-slate-200'>去广告</div>
                        <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>开启后通过代理处理播放链接</div>
                      </div>
                      <span className={`h-5 w-9 rounded-full p-0.5 transition ${subscribeAdFilterEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <span className={`block h-4 w-4 rounded-full bg-white transition ${subscribeAdFilterEnabled ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                    <button
                      type='button'
                      onClick={() => setSubscribeYellowFilterEnabled((prev) => !prev)}
                      className='flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-yellow-400 dark:border-white/10 dark:bg-slate-900/70'
                    >
                      <div>
                        <div className='text-sm font-bold text-slate-800 dark:text-slate-200'>黄色过滤</div>
                        <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>过滤代理搜索中的黄色内容</div>
                      </div>
                      <span className={`h-5 w-9 rounded-full p-0.5 transition ${subscribeYellowFilterEnabled ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <span className={`block h-4 w-4 rounded-full bg-white transition ${subscribeYellowFilterEnabled ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                  </div>

                  <div>
                    <h4 className='mb-2 text-sm font-medium text-slate-700 dark:text-slate-300'>
                      订阅链接
                    </h4>
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200'
                        value={subscribeUrl}
                        readOnly
                      />
                      <button
                        onClick={handleCopySubscribeUrl}
                        className='inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-700'
                      >
                        <Copy className='h-4 w-4' />
                        {copySuccess ? '已复制' : '复制'}
                      </button>
                    </div>
                    {(subscribeAdFilterEnabled || subscribeYellowFilterEnabled) && (
                      <p className='mt-2 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-semibold text-yellow-700 dark:text-yellow-300'>
                        💡 代理模式已开启，某些源可能因为区域或兼容问题无法播放
                      </p>
                    )}
                  </div>

                  <div className='pt-1'>
                    <button
                      onClick={handleResetToken}
                      disabled={isResettingToken}
                      className='w-full cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {isResettingToken ? '重置中...' : '重置订阅Token'}
                    </button>
                    <p className='mt-2 text-center text-xs text-slate-500 dark:text-slate-400'>
                      ⚠️ 重置后旧链接将失效
                    </p>
                    <p id='tvbox-token-message' className='hidden text-center text-xs'></p>
                  </div>
                </div>
              )}
            </section>
          )}

          {tvAccessTab === 'orion' && (
            <section className='rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]'>
              <div className='flex items-center gap-3'>
                <img
                  src='/icons/OrionTV.png'
                  alt='OrionTV'
                  className='h-11 w-11 rounded-2xl object-cover shadow-lg shadow-indigo-500/20'
                />
                <div>
                  <h4 className='text-lg font-black text-slate-900 dark:text-slate-100'>
                    OrionTV
                  </h4>
                  <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                    Android TV 专用客户端
                  </p>
                </div>
              </div>
              <p className='mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400'>
                可直接作为 MoonTV Plus 电视端使用，适合安装到 Android TV / 电视盒子。
              </p>
              <div className='mt-5'>
                <h5 className='mb-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                  Base URL
                </h5>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.origin : ''}
                    className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200'
                  />
                  <button
                    type='button'
                    onClick={handleCopyOrionBaseUrl}
                    className='inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700'
                  >
                    <Copy className='h-4 w-4' />
                    {orionBaseUrlCopySuccess ? '已复制' : '复制'}
                  </button>
                </div>
                <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>
                  在 OrionTV 中填写该地址作为后端服务地址。
                </p>
              </div>
              <a
                href='https://github.com/mtvpls/OrionTV_Build/tags'
                target='_blank'
                rel='noopener noreferrer'
                className='mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700'
              >
                下载 OrionTV
                <ExternalLink className='h-4 w-4' />
              </a>
            </section>
          )}


            </>
          )}
        </div>
      </div>
    </>
  );

  // 修改密码面板内容
  const changePasswordPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={handleCloseChangePassword}
        onTouchMove={(e) => {
          // 只阻止滚动，允许其他触摸事件
          e.preventDefault();
        }}
        onWheel={(e) => {
          // 阻止滚轮滚动
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 修改密码面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] overflow-hidden'>
        {/* 内容容器 - 独立的滚动区域 */}
        <div
          className='h-full p-6'
          data-panel-content
          onTouchMove={(e) => {
            // 阻止事件冒泡到遮罩层，但允许内部滚动
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto', // 允许所有触摸操作
          }}
        >
          {/* 标题栏 */}
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              修改密码
            </h3>
            <button
              onClick={handleCloseChangePassword}
              className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              aria-label='Close'
            >
              <X className='w-full h-full' />
            </button>
          </div>

          {/* 表单 */}
          <div className='space-y-4'>
            {/* 新密码输入 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                新密码
              </label>
              <input
                type='password'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                placeholder='请输入新密码'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* 确认密码输入 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                确认密码
              </label>
              <input
                type='password'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                placeholder='请再次输入新密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* 错误信息 */}
            {passwordError && (
              <div className='text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800'>
                {passwordError}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className='flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <button
              onClick={handleCloseChangePassword}
              className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors'
              disabled={passwordLoading}
            >
              取消
            </button>
            <button
              onClick={handleSubmitChangePassword}
              className='flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? '修改中...' : '确认修改'}
            </button>
          </div>

          {/* 底部说明 */}
          <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
              修改密码后需要重新登录
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // 举报信息弹窗
  const reportPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1002]'
        onClick={() => setIsReportOpen(false)}
        onTouchMove={(e) => {
          e.preventDefault();
        }}
        onWheel={(e) => {
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 举报信息面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1003] overflow-hidden'>
        <div
          className='h-full max-h-[70vh] flex flex-col'
          data-panel-content
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto',
          }}
        >
          {/* 标题栏 */}
          <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              耻辱柱
            </h3>
            <button
              onClick={() => setIsReportOpen(false)}
              className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              aria-label='Close'
            >
              <X className='w-full h-full' />
            </button>
          </div>

          {/* 内容区域 */}
          <div className='flex-1 overflow-y-auto p-6'>
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
              <p className='text-gray-800 dark:text-gray-200 leading-relaxed'>
                抄袭狗
                <span className='font-bold text-red-600 dark:text-red-400'>
                  SzeMeng76
                </span>
                毫无廉耻，盯着本项目的commit区，疯狂抄袭。警告亦全当看不见，实为开源界耻辱。
              </p>
              <p className='text-gray-800 dark:text-gray-200 leading-relaxed mt-3'>
                超分，观影室，豆瓣反爬，精确搜索等等等等，直接抄袭，最不要脸的就是，刚更新一版，几小时后直接抄走。
              </p>
              <p className='text-gray-800 dark:text-gray-200 leading-relaxed mt-3'>
                <span className='font-semibold text-red-600 dark:text-red-400'>
                  2026-02-25：
                </span>
                抄袭emby功能
              </p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className='p-6 border-t border-gray-200 dark:border-gray-700'>
            <button
              onClick={() => setIsReportOpen(false)}
              className='w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors'
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // 生态应用面板内容
  const ecoAppsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]'
        onClick={() => setIsEcoAppsOpen(false)}
        onTouchMove={(e) => {
          e.preventDefault();
        }}
        onWheel={(e) => {
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 生态应用面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl z-[1001] overflow-hidden'>
        <div
          className='h-full max-h-[85vh] flex flex-col'
          data-panel-content
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
          style={{
            touchAction: 'auto',
          }}
        >
          {/* 标题栏 */}
          <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              生态应用
            </h3>
            <div className='flex items-center gap-2'>
              {/* 举报按钮 */}
              <button
                onClick={() => setIsReportOpen(true)}
                className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg'
                aria-label='Report'
                title='举报抄袭'
              >
                🐶
              </button>
              {/* 关闭按钮 */}
              <button
                onClick={() => setIsEcoAppsOpen(false)}
                className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                aria-label='Close'
              >
                <X className='w-full h-full' />
              </button>
            </div>
          </div>

          {/* 应用列表 */}
          <div className='flex-1 overflow-y-auto p-6'>
            <div className='grid gap-6 md:grid-cols-1'>
              {/* MoonTVPlus-PC 客户端 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0 relative'>
                    <img
                      src='/logo.png'
                      alt='MoonTVPlus-PC'
                      className='w-16 h-16 rounded-xl object-cover'
                    />
                    <div className='absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg'>
                      <Monitor className='w-3.5 h-3.5 text-white' />
                    </div>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      MoonTVPlus-PC客户端
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      专为Windows开发的客户端，完美支持私人影库mkv视频
                    </p>
                    <a
                      href='https://github.com/mtvpls/MoonTVPlus-PC/releases'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors'
                    >

                      下载
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  </div>
                </div>
              </div>

              {/* Selene 跨平台客户端 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0 relative'>
                    <img
                      src='/icons/Selene.png'
                      alt='Selene'
                      className='w-16 h-16 rounded-xl object-cover'
                    />
                    <span className='absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded'>
                      二开
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      Selene 跨平台客户端
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      多平台客户端
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <a
                        href='https://github.com/mtvpls/Selene-Build/releases'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors'
                      >

                        下载
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* OrionTV TV专用客户端 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0 relative'>
                    <img
                      src='/icons/OrionTV.png'
                      alt='OrionTV'
                      className='w-16 h-16 rounded-xl object-cover'
                    />
                    <span className='absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded'>
                      二开
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      OrionTV TV专用客户端
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      tv专用
                    </p>
                    <a
                      href='https://github.com/mtvpls/OrionTV_Build/tags'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors'
                    >

                      下载
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  </div>
                </div>
              </div>

              {/* 私人影库转码器 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0 relative'>
                    <div className='w-16 h-16 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm'>
                      <RouterIcon className='w-8 h-8 text-white' />
                    </div>
                    <span className='absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded'>
                      MKV转码
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      私人影库转码器
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      为私人影库中的 MKV
                      视频提供转码播放能力，可解析内封字幕并解决部分视频无音频问题，但通常需要较高的本机性能配置。
                    </p>
                    <a
                      href='https://github.com/mtvpls/moontvplus-transcoder/tags'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors'
                    >

                      下载
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  </div>
                </div>
              </div>

              {/* MoonTVPlus 插件 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0 relative'>
                    <div className='w-16 h-16 rounded-xl bg-purple-500 flex items-center justify-center shadow-sm'>
                      <Puzzle className='w-8 h-8 text-white' />
                    </div>
                    <span className='absolute -top-1 -right-1 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded'>
                      插件
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      MoonTVPlus 插件
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      为 MoonTVPlus
                      提供增强性功能，目前拥有解决私人影库超分跨域能力
                    </p>
                    <a
                      href='https://github.com/mtvpls/moontvplus-extension/releases'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors'
                    >

                      下载
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部说明 */}
          <div className='p-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
              选择适合您设备的客户端下载使用
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className='relative'>
        <button
          onClick={handleMenuClick}
          className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
          aria-label='User Menu'
        >
          <User className='w-full h-full' />
        </button>
        {/* 版本更新红点 */}

        {/* 未读通知红点 */}

      </div>

      {/* 使用 Portal 将菜单面板渲染到 document.body */}
      {isOpen && mounted && createPortal(menuPanel, document.body)}

      <PersonalCenterPanel
        isOpen={isProfileCenterOpen}
        mounted={mounted}
        onClose={() => setIsProfileCenterOpen(false)}
        username={currentUsername}
        roleText={currentRoleText}
        showRoleBadge={shouldShowRoleBadge}
        avatarText={avatarText}
        roleBadgeClassName={roleBadgeClassName}
        showDeviceManagement={storageType !== 'localstorage'}
        showChangePassword={showChangePassword}

        onOpenDeviceManagement={() => {
          setIsProfileCenterOpen(false);
          setIsDeviceManagementOpen(true);
          loadDevices();
        }}
        onOpenChangePassword={() => {
          setIsProfileCenterOpen(false);
          handleChangePassword();
        }}
      />

      {/* 使用 Portal 将设置面板渲染到 document.body */}
      {isSettingsOpen && mounted && createPortal(settingsPanel, document.body)}

      {/* 云备份操作结果 Toast */}


      {/* 使用 Portal 将修改密码面板渲染到 document.body */}
      {isChangePasswordOpen &&
        mounted &&
        createPortal(changePasswordPanel, document.body)}

      {/* 使用 Portal 将订阅面板渲染到 document.body */}
      {isSubscribeOpen &&
        mounted &&
        createPortal(subscribePanel, document.body)}

      {/* 版本面板 */}


      {/* 离线下载面板 */}


      {/* 使用 Portal 将通知面板渲染到 document.body */}


      {/* 使用 Portal 将收藏面板渲染到 document.body */}
      {isFavoritesPanelOpen &&
        mounted &&
        createPortal(
          <FavoritesPanel
            isOpen={isFavoritesPanelOpen}
            onClose={() => setIsFavoritesPanelOpen(false)}
          />,
          document.body
        )}

      {/* 使用 Portal 将下载文件管理面板渲染到 document.body */}




      <DeviceManagementPanel
        isOpen={isDeviceManagementOpen}
        mounted={mounted}
        onClose={() => setIsDeviceManagementOpen(false)}
        devices={devices}
        devicesLoading={devicesLoading}
        revoking={revoking}
        onRevokeDevice={handleRevokeDevice}
        onRevokeAllDevices={handleRevokeAllDevices}
        getDeviceIcon={getDeviceIcon}
      />



      {/* 使用 Portal 将生态应用面板渲染到 document.body */}
      {isEcoAppsOpen && mounted && createPortal(ecoAppsPanel, document.body)}

      {/* 使用 Portal 将举报信息面板渲染到 document.body */}
      {isReportOpen && mounted && createPortal(reportPanel, document.body)}

      {/* 确认对话框 */}
      {confirmDialog.isOpen &&
        mounted &&
        createPortal(
          <div className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4'>
              {/* 标题 */}
              <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {confirmDialog.title}
                </h3>
              </div>

              {/* 内容 */}
              <div className='p-6'>
                <p className='text-gray-700 dark:text-gray-300'>
                  {confirmDialog.message}
                </p>
              </div>

              {/* 按钮 */}
              <div className='p-6 pt-0 flex gap-3 justify-end'>
                <button
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, isOpen: false })
                  }
                  className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors'
                >
                  取消
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className='px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors'
                >
                  确定
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
