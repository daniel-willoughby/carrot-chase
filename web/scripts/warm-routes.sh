#!/usr/bin/env bash
# Warm up Turbopack by hitting every dashboard route once.
#
# Next 16's dev compiler is lazy — the FIRST request to each route takes
# 10-15s on this machine, every subsequent request is sub-second. Running
# this script after `npm run dev` (in a second terminal) front-loads all
# of that pain so the browser session feels instant.
#
# Anonymous requests will be redirected to /login by the proxy, but the
# route compile still happens — that's what we want.

set -u

BASE="${BASE:-http://localhost:3000}"
PATHS=(
  "/login"
  "/dashboard/lead"
  "/dashboard/lead/members"
  "/dashboard/lead/events"
  "/dashboard/lead/events/new"
  "/dashboard/lead/leaderboard"
  "/dashboard/lead/run"
  "/dashboard/school"
  "/dashboard/school/groups"
  "/dashboard/school/members"
  "/dashboard/school/courses"
  "/dashboard/school/events"
  "/dashboard/school/leaderboard"
  "/dashboard/super"
  "/dashboard/super/organisations"
  "/dashboard/super/billing"
)

echo "Warming ${#PATHS[@]} routes against ${BASE}…"
for p in "${PATHS[@]}"; do
  printf "  %-50s " "$p"
  ms=$(curl -sS -o /dev/null -w "%{time_total}" "${BASE}${p}" 2>/dev/null)
  printf "%ss\n" "$ms"
done
echo "Done — subsequent requests to these routes will be sub-second."
