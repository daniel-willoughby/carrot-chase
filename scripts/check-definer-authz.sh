#!/usr/bin/env bash
#
# CI tripwire: SECURITY DEFINER authorisation check.
#
# A SECURITY DEFINER function bypasses RLS, so it MUST enforce organisation
# ownership itself. The recurring bug class (fixed in migration 0010) is a
# definer function that authorises with role only — public.is_school_admin()
# — without also checking the target belongs to the caller's org via
# public.belongs_to_organisation() / public.current_organisation_id().
#
# This script flags any migration that defines a SECURITY DEFINER function
# referencing is_school_admin() but NOT an org-scoping helper. It's a cheap,
# no-database heuristic meant to catch the obvious reintroduction in review;
# the authoritative guard is the runtime test in supabase/tests/rls_cross_org.sql.
#
# Exit 0 = clean, 1 = a suspicious migration was found.

set -euo pipefail

MIGRATIONS_DIR="${1:-supabase/migrations}"

# Historical migrations that contained the old pattern and are now SUPERSEDED
# by a later, fixed redefinition. They remain in the repo as applied history.
SUPERSEDED=(
  "0006_add_late_arrival.sql"                 # fixed by 0010
  "0007_fix_late_arrival_types.sql"           # fixed by 0010
  "0009_commit_results_security_definer.sql"  # fixed by 0010
)

is_superseded() {
  local base; base="$(basename "$1")"
  for s in "${SUPERSEDED[@]}"; do
    [[ "$base" == "$s" ]] && return 0
  done
  return 1
}

flagged=0
for file in "$MIGRATIONS_DIR"/*.sql; do
  [[ -e "$file" ]] || continue
  is_superseded "$file" && continue

  # Only interested in files that declare a SECURITY DEFINER function.
  grep -qiE 'security[[:space:]]+definer' "$file" || continue
  # ...that gate on the school-admin role...
  grep -qiE 'is_school_admin' "$file" || continue
  # ...but never scope to the caller's organisation.
  if ! grep -qiE 'belongs_to_organisation|current_organisation_id' "$file"; then
    echo "::error file=$file::SECURITY DEFINER function uses is_school_admin() without an organisation check (belongs_to_organisation / current_organisation_id). Cross-org write risk — see migration 0010 and docs/SECURITY.md."
    flagged=1
  fi
done

if [[ "$flagged" -eq 0 ]]; then
  echo "✓ definer-authz check passed: no unscoped SECURITY DEFINER admin writes found."
fi
exit "$flagged"
