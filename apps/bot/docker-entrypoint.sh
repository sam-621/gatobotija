#!/bin/sh
set -eu

if [ -n "${YT_DLP_COOKIES:-}" ]; then
  config_dir="$HOME/.config/yt-dlp"
  mkdir -p "$config_dir"
  printf '%s' "$YT_DLP_COOKIES" | base64 -d > "$config_dir/cookies.txt"
  printf -- '--cookies %s\n' "$config_dir/cookies.txt" > "$config_dir/config"
fi

exec "$@"
