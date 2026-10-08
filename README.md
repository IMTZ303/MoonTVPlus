# MoonTVPlus ECS + SQLite 精简版

本包使用 Docker Compose 部署单实例 MoonTVPlus，数据库为随项目运行的 SQLite。

## 安装与配置

部署前可运行只读环境检查，输出可复用环境、端口和下载源状态：

```sh
sh scripts/check-ecs.sh
```

构建长时间无进展时，按 Ctrl+C 中断当前构建，再使用详细日志定位具体步骤：

```sh
docker compose --progress plain build
```

构建成功后执行下面的启动命令即可。检查脚本不会修改现有项目。

构建依赖按 Python → make → g++ → pnpm → 项目依赖顺序执行；最终运行镜像的软件安装等待项目构建完成。依赖下载并发、依赖构建并发和 Next.js 构建工作进程均设为 1，Node 构建堆上限设为 1024MB（不等于整个构建的内存上限）。已有 Docker、Compose 和有效构建缓存可复用。宿主机 Python 属于宝塔环境，不能直接替代容器内 Python。

容器内 Alpine 软件源使用阿里云镜像站，npm 使用默认源。已有镜像层缓存默认保留并复用，无需清理其他项目的容器或镜像。

2GB 服务器同时运行其他项目时，能否完成本机源码构建取决于剩余内存和交换空间。若仍卡住，请先提供检查脚本的输出及详细构建日志，判断下载慢还是内存不足。

默认配置已写入 `compose.yaml`。GitHub 版本不包含实际密码，请将 `.env.example` 复制为 `.env` 并填写管理员密码。解压程序包，将整个项目目录放到服务器，在项目目录执行：

```sh
docker compose up -d --build
```

访问 `http://服务器IP:3088`。管理员用户名为 `admin`，密码为 `.env` 中的 `PASSWORD`，系统内称为“站长”。站点名称为 MoonTV，TVBox 订阅默认开启。

SQLite 自动初始化，数据保存在项目目录的 `data/moontv.db`。重建容器时请保留 `data` 目录。

## 管理员配置 JSON 视频源

进入 **管理后台 → 配置文件**，粘贴 JSON 或上传 `.json` 文件，点击保存。以下为格式示例，需将 API 地址替换为实际可用的视频源地址：

```json
{
  "api_site": {
    "source1": {
      "name": "我的视频源",
      "api": "https://example.com/api.php/provide/vod"
    }
  }
}
```

`source1` 是视频源的唯一标识，多个视频源可在 `api_site` 下使用不同标识添加。上传文件会合并现有配置；如需完整修改，直接编辑文本后保存。

管理员可在后台创建普通用户。普通用户使用已配置的视频源搜索和播放，不能进入管理后台或保存 JSON 视频源配置。

直播源、TMDB 密钥和 TVBox 按需在后台配置。

## 中国频道直播列表

在管理后台的直播源列表填写：名称“中国频道”，Key `china_public`，M3U 地址 `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u`；节目单和自定义 UA 可先留空。添加后点击刷新直播源。

该地址来自公开频道集合 https://github.com/iptv-org/iptv ，包含标注 1080p 的条目，也有低清、地区限制或失效条目。列表内容已核对，未在用户 ECS 上逐频道播放测速；不能保证所有频道高清稳定。`rtp://239...` 运营商组播地址不能直接用于普通公网 ECS。

本包为源码构建部署包，Compose 会构建镜像。源码生产构建和核心接口检查已通过；未在本机执行 Docker 容器运行验证。
