import { AdminConfig } from './admin.types';



// 播放记录数据结构
export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number; // 第几集
  total_episodes: number; // 总集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总进度（秒）
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  new_episodes?: number; // 新增的剧集数量（用于显示更新提示）
  origin?: 'vod' | 'live';
  /** 是否动漫（写入时根据 CMS type_name/class 判断） */
  is_anime?: boolean;
}

// 收藏数据结构
export interface Favorite {
  source_name: string;
  total_episodes: number; // 总集数
  title: string;
  year: string;
  cover: string;
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  origin?: 'vod' | 'live';
  is_completed?: boolean; // 是否已完结
  vod_remarks?: string; // 视频备注信息
}

// 存储接口
export interface IStorage {
  // 播放记录相关
  getPlayRecord(userName: string, key: string): Promise<PlayRecord | null>;
  setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void>;
  getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }>;
  deletePlayRecord(userName: string, key: string): Promise<void>;
  deletePlayRecords(userName: string, keys: string[]): Promise<void>;
  // 清理超出限制的旧播放记录
  cleanupOldPlayRecords(userName: string): Promise<void>;
  // 迁移播放记录
  migratePlayRecords(userName: string): Promise<void>;

  // 收藏相关
  getFavorite(userName: string, key: string): Promise<Favorite | null>;
  setFavorite(userName: string, key: string, favorite: Favorite): Promise<void>;
  getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }>;
  deleteFavorite(userName: string, key: string): Promise<void>;
  // 迁移收藏
  migrateFavorites(userName: string): Promise<void>;

  // 音乐播放记录相关







  // 用户相关
  verifyUser(userName: string, password: string): Promise<boolean>;
  // 检查用户是否存在（无需密码）
  checkUserExist(userName: string): Promise<boolean>;
  // 修改用户密码
  changePassword(userName: string, newPassword: string): Promise<void>;
  // 删除用户（包括密码、搜索历史、播放记录、收藏夹）
  deleteUser(userName: string): Promise<void>;

  // 搜索历史相关
  getSearchHistory(userName: string): Promise<string[]>;
  addSearchHistory(userName: string, keyword: string): Promise<void>;
  deleteSearchHistory(userName: string, keyword?: string): Promise<void>;

  // 漫画书架相关





  // 漫画阅读历史相关






  // 电子书书架相关





  // 电子书阅读历史相关






  // 用户列表
  getAllUsers(): Promise<string[]>;

  // 管理员配置相关
  getAdminConfig(): Promise<AdminConfig | null>;
  setAdminConfig(config: AdminConfig): Promise<void>;

  // 跳过片头片尾配置相关
  getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null>;
  setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void>;
  deleteSkipConfig(userName: string, source: string, id: string): Promise<void>;
  getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }>;
  // 迁移跳过配置
  migrateSkipConfigs(userName: string): Promise<void>;

  // 弹幕过滤配置相关




  // 数据清理相关
  clearAllData(): Promise<void>;

  // 通用键值存储
  getGlobalValue(key: string): Promise<string | null>;
  setGlobalValue(key: string, value: string): Promise<void>;
  deleteGlobalValue(key: string): Promise<void>;

  // 通知相关







  // 收藏更新检查相关
  getLastFavoriteCheckTime(userName: string): Promise<number>;
  setLastFavoriteCheckTime(userName: string, timestamp: number): Promise<void>;

  // 求片冷却时间


  // 求片相关









  // 新版用户存储（V2）- 可选方法
  getUserInfoV2?(userName: string): Promise<{
    role: 'owner' | 'admin' | 'user';
    banned: boolean;
    tags?: string[];

    enabledApis?: string[];
    created_at: number;
    playrecord_migrated?: boolean;
    favorite_migrated?: boolean;
    skip_migrated?: boolean;
    last_movie_request_time?: number;
    email?: string; // 用户邮箱
     // 是否接收邮件通知
  } | null>;

  // 用户邮箱相关
  getUserEmail?(userName: string): Promise<string | null>;
  setUserEmail?(userName: string, email: string): Promise<void>;


  // Web Push订阅相关







  // Telegram Bot绑定相关









  // TVBox订阅token相关
  getTvboxSubscribeToken?(userName: string): Promise<string | null>;
  setTvboxSubscribeToken?(userName: string, token: string): Promise<void>;
  getUsernameByTvboxToken?(token: string): Promise<string | null>;

  // 本地设置云同步相关（可选，各存储后端按需实现）


}

// 本地设置云同步记录（与关系型表 user_local_settings 逐列对应；Redis 存为单 JSON 文档）






// 搜索结果数据结构
export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  episodes_titles: string[];
  source: string;
  source_name: string;
  weight?: number; // 播放源权重（来自后台配置，用于排序和优选评分）
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
  vod_remarks?: string; // 视频备注信息（如"全80集"、"更新至25集"等）
  vod_total?: number; // 总集数
  proxyMode?: boolean; // 代理模式：启用后由服务器代理m3u8和ts分片
  subtitles?: Array<Array<{
    label: string;
    url: string;
    fallbackUrl?: string;
    fallbackFormat?: string;
    language?: string;
    format?: string; // 实际加载格式，如 vtt / ass / ssa
    sourceFormat?: string; // Emby 返回的原始字幕格式
    codec?: string;
    isExternal?: boolean;
    renderMode?: 'native' | 'jassub' | 'bitsub';
  }>>; // 字幕列表（按集数索引）
  tmdb_id?: number; // TMDB ID
  rating?: number; // 评分
  initialEpisodeIndex?: number; // 初始集数索引（用于小雅源从文件点击进入时指定集数）
  metadataSource?: 'folder' | 'nfo' | 'tmdb' | 'file'; // 元数据来源（用于小雅源判断是否保留fileName）
  /** OpenList 路径元信息：是否启用 14 分钟播放 URL 续期 */
  refresh14m?: boolean;
  /** OpenList 路径元信息：分类 */
  category?: string;
}

// 豆瓣数据结构
export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}

// 跳过片头片尾配置数据结构
export interface SkipConfig {
  enable: boolean; // 是否启用跳过片头片尾
  intro_time: number; // 片头时间（秒）
  outro_time: number; // 片尾时间（秒）
}

// 弹幕过滤规则数据结构


// 弹幕过滤配置数据结构


// 集数过滤规则数据结构
export interface EpisodeFilterRule {
  keyword: string; // 关键字
  type: 'normal' | 'regex'; // 普通模式或正则模式
  enabled: boolean; // 是否启用
  id?: string; // 规则ID（用于前端管理）
}

// 集数过滤配置数据结构
export interface EpisodeFilterConfig {
  rules: EpisodeFilterRule[]; // 过滤规则列表
  reverseMode?: boolean; // 反向模式：开启后仅显示符合规则的集数
}








// 通知类型枚举
 // 追番订阅更新

// 通知数据结构


// 收藏更新检查结果
export interface FavoriteUpdateCheck {
  last_check_time: number; // 上次检查时间戳
  updates: Array<{
    source: string;
    id: string;
    title: string;
    old_episodes: number;
    new_episodes: number;
  }>;
}

// 求片请求数据结构
