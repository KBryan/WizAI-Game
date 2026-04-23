#!/bin/bash

# Run Cloudflare tunnel to expose adws/trigger_webhook.py to the public internet
# Requires CLOUDFLARED_TUNNEL_TOKEN to be set in .env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect project root: look for manifest.yml or AGENTS.md by walking up
PROJECT_ROOT=""
current_dir="$SCRIPT_DIR"
while [ "$current_dir" != "/" ]; do
    if [ -f "$current_dir/manifest.yml" ] || [ -f "$current_dir/AGENTS.md" ]; then
        PROJECT_ROOT="$current_dir"
        break
    fi
    current_dir="$(dirname "$current_dir")"
done

# Fallback: assume parent of scripts directory
if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

ENV_FILE="$PROJECT_ROOT/.env"

# Load CLOUDFLARED_TUNNEL_TOKEN from .env file
if [ -f "$ENV_FILE" ]; then
    export CLOUDFLARED_TUNNEL_TOKEN=$(grep CLOUDFLARED_TUNNEL_TOKEN "$ENV_FILE" | cut -d '=' -f2-)
fi

cloudflared tunnel run --token $CLOUDFLARED_TUNNEL_TOKEN