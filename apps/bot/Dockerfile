FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM debian:bookworm-slim AS yt-dlp
ARG TARGETARCH
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
ADD https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS /tmp/SHA2-256SUMS
RUN set -eu; \
  case "$TARGETARCH" in \
    amd64) asset=yt-dlp_linux ;; \
    arm64) asset=yt-dlp_linux_aarch64 ;; \
    *) echo "Unsupported arch: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  cd /tmp; \
  curl -fsSL -o "$asset" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$asset"; \
  grep " $asset\$" SHA2-256SUMS | sha256sum -c -; \
  install -m 755 "$asset" /usr/local/bin/yt-dlp

FROM node:24-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=yt-dlp /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp
RUN printf -- '--js-runtimes node\n' > /etc/yt-dlp.conf
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER node
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
