export interface AdminConfig {
SiteConfig: {
    SiteName: string;
    Announcement: string;
    // 公告显示模式：once=单次显示（每个用户每条公告仅显示一次，换公告则重新显示）；every=每次显示（每次打开首页都显示）
    AnnouncementDisplayMode?: 'once' | 'every';
    SearchDownstreamMaxPage: number;
    SiteInterfaceCacheTime: number;
    DoubanProxyType: string;
    DoubanProxy: string;
    DoubanImageProxyType: string;
    DoubanImageProxy: string;
    DisableYellowFilter: boolean;
    FluidSearch: boolean;
    // 弹幕配置



     // 是否默认自动加载弹幕（用户可在本地覆盖）
    // TMDB配置
    TMDBApiKey?: string;
    TMDBProxy?: string;
    TMDBReverseProxy?: string;
    // TMDB 图片默认地址：用户未在本地数据源设置中配置时，图片默认使用该地址
    TMDBImageBaseUrl?: string;
    // 动漫/Bangumi配置





    BannerDataSource?: string; // 轮播图数据源：TMDB、TX 或 Douban
    RecommendationDataSource?: string; // 更多推荐数据源：Douban、TMDB、Mixed
    // 本地设置云同步模式：off=关闭，manual=手动（面板右上角备份/恢复按钮），auto=自动（进入网站静默拉取、面板打开静默同步）

    // Pansou配置




    // 磁链配置





    // 评论功能开关

    // 自定义去广告代码
    CustomAdFilterCode?: string;
    CustomAdFilterVersion?: number; // 代码版本号（时间戳）
    // 注册相关配置
     // 开启注册
     // 注册时要求邀请码
     // 通用注册邀请码
     // 注册启用Cloudflare Turnstile
    LoginRequireTurnstile?: boolean; // 登录启用Cloudflare Turnstile
    TurnstileSiteKey?: string; // Cloudflare Turnstile Site Key
    TurnstileSecretKey?: string; // Cloudflare Turnstile Secret Key
    DefaultUserTags?: string[]; // 新注册用户的默认用户组
    // 求片功能配置
     // 启用求片功能
     // 求片冷却时间（秒），默认3600
    // OIDC配置
     // 启用OIDC登录
     // 启用OIDC注册
     // OIDC Issuer URL (用于自动发现)
     // 授权端点
     // Token端点
     // 用户信息端点
     // OIDC Client ID
     // OIDC Client Secret
     // OIDC登录按钮文字
     // 最低信任等级（仅LinuxDo网站有效，为0时不判断）
    // 流量统计配置
     // 是否启用流量统计
     // 统计服务提供商
     // 脚本URL（Umami: umami.js地址; GA: gtag URL; 自定义: 脚本src）
     // 网站ID（Umami: website_id; GA: Measurement ID如G-XXXX; 自定义: 留空）
     // 自定义统计代码（仅custom模式使用，完整的HTML脚本内容）
  };
  ConfigSubscribtion: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  };
  ConfigFile: string;

  UserConfig: {
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
      enabledApis?: string[]; // 优先级高于tags限制
      tags?: string[]; // 多 tags 取并集限制
    }[];
    Tags?: {
      name: string;
      enabledApis: string[];
      permissions?: string[];
    }[];
  };
   // 特殊源 key 列表，默认对普通入口隐藏
  ClientAdSourceApis?: string[]; // 客户端去广告源 key 列表：MoonTVPlus APP / OrionTV 请求 source-detail 时 m3u8 套 proxy-m3u8
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    from: 'config' | 'custom';
    disabled?: boolean;
    proxyMode?: boolean; // 代理模式开关：启用后由服务器代理m3u8和ts分片
    weight?: number; // 权重：用于排序和优选评分，默认0，范围0-100
  }[];
  CustomCategories: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
  LiveRefreshIntervalHours?: number; // 电视直播全局刷新间隔（小时），默认12小时
  LiveConfig?: {
    key: string;
    name: string;
    url: string; // m3u 地址
    ua?: string;
    epg?: string; // 节目单
    from: 'config' | 'custom';
    channelNumber?: number;
    disabled?: boolean;
    proxyMode?: 'full' | 'm3u8-only' | 'direct'; // 代理模式：full=全量代理，m3u8-only=仅代理m3u8，direct=直连
  }[];

   // 网络直播功能总开关








  EmailConfig?: {
    enabled: boolean; // 是否启用邮件通知
    provider: 'smtp' | 'resend'; // 邮件发送方式
    // SMTP配置
    smtp?: {
      host: string; // SMTP服务器地址
      port: number; // SMTP端口（25/465/587）
      secure: boolean; // 是否使用SSL/TLS
      user: string; // SMTP用户名
      password: string; // SMTP密码
      from: string; // 发件人邮箱
    };
    // Resend配置
    resend?: {
      apiKey: string; // Resend API Key
      from: string; // 发件人邮箱
    };
  };



}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
