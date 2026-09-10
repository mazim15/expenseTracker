#!/usr/bin/env bash
# Activate a shipped release. Run on the server as root.
# Usage: activate.sh <release-id>   (expects /tmp/expense-release.tar.gz)
set -euo pipefail

REL_ID="${1:?usage: activate.sh <release-id>}"
REL="/opt/expense/releases/$REL_ID"
PREV="$(readlink -f /opt/expense/current || true)"

rm -rf "$REL"
mkdir -p "$REL"
tar -xzf /tmp/expense-release.tar.gz -C "$REL"
rm -f /tmp/expense-release.tar.gz
chown -R expense:expense "$REL"

ln -sfn "$REL" /opt/expense/current
systemctl restart expense

# wait for health, roll back to the previous release if it never comes up
for _ in $(seq 1 20); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = "200" ]; then
    echo "healthy: $REL_ID"
    ls -1dt /opt/expense/releases/* | tail -n +4 | xargs -r rm -rf
    exit 0
  fi
  sleep 3
done

echo "health check failed for $REL_ID" >&2
journalctl -u expense -n 50 --no-pager >&2
if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$REL" ]; then
  echo "rolling back to $PREV" >&2
  ln -sfn "$PREV" /opt/expense/current
  systemctl restart expense
fi
exit 1
