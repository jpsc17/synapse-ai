#!/bin/sh
set -eu

export N8N_PORT="${PORT:-${N8N_PORT:-5678}}"
exec n8n start
