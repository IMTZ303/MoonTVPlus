#!/bin/sh
# Read-only deployment checks. Does not install, stop or modify services.
set -u
printf '\n=== 系统与资源 ===\n'
uname -sm
if [ -r /etc/os-release ]; then
  grep '^PRETTY_NAME=' /etc/os-release
fi
if command -v free >/dev/null 2>&1; then free -h; fi
df -h .
printf '\n=== 宿主机已有工具（Docker 构建不直接使用它们） ===\n'
for tool in python3 node pnpm nginx; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '%s: ' "$tool"
    command -v "$tool"
  else
    printf '%s: 未在当前 PATH 找到\n' "$tool"
  fi
done
if [ -d /www/server/panel ]; then printf '发现宝塔面板目录。\n'; fi
printf '\n=== 3088 端口 ===\n'
if command -v ss >/dev/null 2>&1; then
  ports=$(ss -H -ltn 'sport = :3088' 2>/dev/null)
  if [ -n "$ports" ]; then
    printf '3088 已被监听，请先确认所属项目：\n%s\n' "$ports"
  else
    printf '3088 暂无 TCP 监听。\n'
  fi
else
  printf '缺少 ss，无法确认端口是否空闲。\n'
fi
printf '\n=== Docker 与 Compose ===\n'
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker compose version 2>/dev/null || printf '当前账号无法使用 docker compose。\n'
  if docker info --format 'Server={{.ServerVersion}} OS={{.OSType}} Architecture={{.Architecture}}' 2>/dev/null; then
    printf '当前 Docker 服务可访问，可复用，无需重装。\n'
    printf '\n现有容器（不读取环境变量或密码）：\n'
    docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
    printf '\n现有 Compose 项目：\n'
    docker compose ls 2>/dev/null || true
    printf '\n现有网络（本项目默认会使用自己的 Compose 网络）：\n'
    docker network ls --format 'table {{.Name}}\t{{.Driver}}'
    printf '\n本地已有 Node 基础镜像：\n'
    docker image ls node --format '{{.Repository}}:{{.Tag}} {{.Size}}'
  else
    printf 'Docker 不可访问：需确认服务状态、当前账号权限或 Docker context。\n'
  fi
else
  printf '未找到 Docker 命令。\n'
fi
printf '\n=== 下载源连通性（宿主机，不代表构建容器） ===\n'
if command -v curl >/dev/null 2>&1; then
  for url in https://dl-cdn.alpinelinux.org/alpine/ https://registry.npmjs.org/pnpm https://mirrors.aliyun.com/alpine/; do
    printf '%s\n' "$url"
    curl -I -L -sS --connect-timeout 5 --max-time 10 -o /dev/null \
      -w 'HTTP=%{http_code} 耗时=%{time_total}s\n' "$url" || true
  done
else
  printf '未找到 curl，跳过连通性检查。\n'
fi
printf '\n=== 可跳过的环境搭建 ===\n'
printf '已有可用 Docker + Compose 时，无需重装。\n'
printf '宿主机无需安装 Node.js、pnpm、Python 或独立数据库；SQLite 随项目运行。\n'
printf '现有反向代理可能可复用，请根据以上容器信息确认。\n'
printf 'Docker 构建仍需容器内部的构建依赖；宿主机已装软件不能替代它们。\n'
