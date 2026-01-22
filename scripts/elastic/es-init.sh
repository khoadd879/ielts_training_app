#!/usr/bin/env sh
set -eu

# ====== Config (có thể override bằng env) ======
ES_URL="${ES_URL:-http://localhost:9200}"
INDEX="${INDEX:-dictionary_v1}"
ALIAS="${ALIAS:-dictionary_current}"
INDEX_FILE="${INDEX_FILE:-./index.dictionary_v1.json}"

# ====== Helpers ======
info() { printf "%s\n" "$*"; }
fail() { printf "ERROR: %s\n" "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing '$1'. Please install it."
}

http_code() {
  # usage: http_code URL
  curl -s -o /dev/null -w "%{http_code}" "$1"
}

# ====== Preflight ======
need curl

[ -f "$INDEX_FILE" ] || fail "Index template not found: $INDEX_FILE"

info "ES_URL=$ES_URL"
info "INDEX=$INDEX"
info "ALIAS=$ALIAS"
info "INDEX_FILE=$INDEX_FILE"

# ====== Wait ES ======
info "Waiting for Elasticsearch..."
i=0
until curl -s "$ES_URL" >/dev/null 2>&1; do
  i=$((i+1))
  [ "$i" -le 60 ] || fail "Elasticsearch not reachable at $ES_URL after 60s"
  sleep 1
done
info "Elasticsearch is up."

# ====== Create index if missing ======
code="$(http_code "$ES_URL/$INDEX")"
if [ "$code" = "200" ]; then
  info "Index '$INDEX' already exists."
else
  info "Creating index '$INDEX' from $INDEX_FILE ..."
  curl -sS -X PUT "$ES_URL/$INDEX" \
    -H "Content-Type: application/json" \
    --data-binary "@$INDEX_FILE"
  echo
fi

# ====== Create alias if missing ======
code="$(http_code "$ES_URL/_alias/$ALIAS")"
if [ "$code" = "200" ]; then
  info "Alias '$ALIAS' already exists."
else
  info "Creating alias '$ALIAS' -> '$INDEX' ..."
  curl -sS -X POST "$ES_URL/_aliases" \
    -H "Content-Type: application/json" \
    -d "{\"actions\":[{\"add\":{\"index\":\"$INDEX\",\"alias\":\"$ALIAS\"}}]}"
  echo
fi

# ====== Optional: index 1 test doc ======
if [ "${SEED_TEST_DOC:-0}" = "1" ]; then
  info "Seeding one test doc..."
  curl -sS -X PUT "$ES_URL/$ALIAS/_doc/1" \
    -H "Content-Type: application/json" \
    -d '{"id":1,"word":"Từ điển","wordNorm":"tu dien","pos":"noun","data":{"source":"manual"},"importedAt":"2025-12-14T00:00:00Z"}'
  echo
fi

info "Done."
