FROM node:24-alpine AS deps
WORKDIR /app
ENV MAKEFLAGS=-j1 npm_config_jobs=1
RUN sed -i 's|dl-cdn.alpinelinux.org/alpine|mirrors.aliyun.com/alpine|g' /etc/apk/repositories
RUN command -v python3 >/dev/null 2>&1 || apk add --no-cache python3
RUN command -v make >/dev/null 2>&1 || apk add --no-cache make
RUN command -v g++ >/dev/null 2>&1 || apk add --no-cache g++
RUN npm install -g pnpm@10.14.0
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1024
RUN pnpm build
RUN pnpm deploy --filter=. --prod --legacy /tmp/prod-deps

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3088 NEXT_TELEMETRY_DISABLED=1 SQLITE_DB_PATH=/app/.data/moontv.db
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
RUN sed -i 's|dl-cdn.alpinelinux.org/alpine|mirrors.aliyun.com/alpine|g' /etc/apk/repositories
RUN apk add --no-cache su-exec
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /tmp/prod-deps/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/scripts/init-sqlite.js ./scripts/init-sqlite.js
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/start.js ./start.js
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/.data && chown nextjs:nodejs /app/.data
EXPOSE 3088
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "start.js"]
