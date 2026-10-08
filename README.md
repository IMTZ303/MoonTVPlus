# MoonTVPlus Vercel 精简版

保留影视搜索与播放、选集与换源、收藏、观看记录、直播与 EPG、豆瓣、TMDB、视频源脚本、外部播放器、Anime4K、去广告、TVBox、账号与设备管理。管理员可在管理后台的“配置文件”中编辑或上传 JSON 视频源；普通用户不能保存后台配置。

## Vercel 部署配置

导入自己的 GitHub 仓库，框架选择 Next.js，Node.js 使用 24.x。安装命令为 `pnpm install --frozen-lockfile`，构建命令为 `pnpm build`。Vercel 使用标准 Next.js 输出，不需要 Docker、SQLite 或服务器端口映射。

在 Vercel 项目环境变量中配置：

| 变量 | 内容 |
|---|---|
| USERNAME | 管理员用户名，如 admin |
| PASSWORD | 管理员密码兼登录签名密钥 |
| NEXT_PUBLIC_SITE_NAME | MoonTV |
| NEXT_PUBLIC_STORAGE_TYPE | upstash |
| ENABLE_TVBOX_SUBSCRIBE | true |
| UPSTASH_REDIS_REST_URL | Upstash REST 地址 |
| UPSTASH_REDIS_REST_TOKEN | Upstash REST 令牌 |

兼容旧项目的 `UPSTASH_URL`、`UPSTASH_TOKEN` 变量名。密钥仅设置在 Vercel 环境变量中，不提交 GitHub。项目默认函数区域为东京 `hnd1`，与此前日区数据库接近；若数据库区域不同，可修改 `vercel.json` 中的 regions。

既有 Upstash 的影视记录、收藏、用户和管理员配置沿用原 Redis 键结构。部署或构建不会清空数据库。ECS SQLite 数据不会自动同步到 Upstash。

## 本地运行

复制 `.env.example` 为 `.env.local` 并填写数据库和管理员参数，然后执行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

部署完成后通过 Vercel 提供的域名访问，使用管理员账号登录并配置视频源。本版已移除弹幕、音乐、漫画、小说、私人影库、下载、通知、观影室等已确认删除的功能，不配置定时任务。
