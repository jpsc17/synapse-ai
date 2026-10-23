#!/bin/sh
set -eu

N8N_DATA_DIR="/home/node/.n8n"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$N8N_DATA_DIR}"
export N8N_PORT="${PORT:-${N8N_PORT:-5678}}"

if [ "$N8N_USER_FOLDER" != "$N8N_DATA_DIR" ]; then
  echo "ERROR: N8N_USER_FOLDER must remain $N8N_DATA_DIR for the mounted Railway volume." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: the n8n entrypoint must start as root to repair volume ownership." >&2
  exit 1
fi

mkdir -p "$N8N_DATA_DIR"

node_uid="$(id -u node)"
node_gid="$(id -g node)"
expected_owner="${node_uid}:${node_gid}"
directory_owner="$(stat -c '%u:%g' "$N8N_DATA_DIR")"
needs_chown=false

if [ "$directory_owner" != "$expected_owner" ]; then
  needs_chown=true
elif [ -e "$N8N_DATA_DIR/config" ]; then
  config_owner="$(stat -c '%u:%g' "$N8N_DATA_DIR/config")"
  if [ "$config_owner" != "$expected_owner" ]; then
    needs_chown=true
  fi
fi

if [ "$needs_chown" = true ]; then
  echo "Correcting ownership of $N8N_DATA_DIR for the node user."
  chown -R node:node "$N8N_DATA_DIR"
fi

directory_owner="$(stat -c '%u:%g' "$N8N_DATA_DIR")"
if [ "$directory_owner" != "$expected_owner" ]; then
  echo "ERROR: $N8N_DATA_DIR owner is $directory_owner; expected $expected_owner." >&2
  exit 1
fi

if ! /sbin/su-exec node:node test -w "$N8N_DATA_DIR"; then
  echo "ERROR: the node user cannot write to $N8N_DATA_DIR." >&2
  exit 1
fi

exec /sbin/su-exec node:node n8n start
