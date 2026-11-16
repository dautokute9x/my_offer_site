#!/usr/bin/env bash
# Postgres cục bộ để test DB: start|reset|psql|stop. Cổng 54329, trust auth, DB `app`.
# Chạy root: Postgres từ chối root nên initdb/pg_ctl chạy qua user `postgres` (runuser).
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=/usr/lib/postgresql/16/bin
PORT=54329
DATA="${TMPDIR:-/tmp}/pgdata"
PSQL=(psql -X -q -h 127.0.0.1 -p $PORT -U postgres)
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }

start() {
  if [ ! -d "$DATA" ]; then
    mkdir -p "$DATA"; [ "$(id -u)" = 0 ] && chown postgres "$DATA"
    as_pg $BIN/initdb -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  fi
  as_pg $BIN/pg_ctl -D "$DATA" status >/dev/null 2>&1 ||
    as_pg $BIN/pg_ctl -D "$DATA" -l "$DATA/log" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -w start >/dev/null
}

reset() {
  start
  "${PSQL[@]}" -d postgres -c "drop database if exists app with (force)" -c "create database app"
  # Roles là cấp cluster: xóa để stubs chạy lại được.
  "${PSQL[@]}" -d postgres -c "drop role if exists anon" -c "drop role if exists authenticated" -c "drop role if exists service_role" 2>/dev/null || true
  for f in tests/db/supabase-stubs.sql supabase/migrations/*.sql supabase/seed_catalog.sql supabase/seed_demo.sql; do
    [ -f "$f" ] && "${PSQL[@]}" -d app -v ON_ERROR_STOP=1 -f "$f"
  done
  return 0
}

case "${1:-}" in
  start) start ;;
  reset) reset ;;
  psql) start; shift; exec "${PSQL[@]}" -d app "$@" ;;
  stop) as_pg $BIN/pg_ctl -D "$DATA" stop -m fast 2>/dev/null || true ;;
  *) echo "usage: $0 start|reset|psql|stop" >&2; exit 1 ;;
esac
