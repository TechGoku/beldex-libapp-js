#!/usr/bin/env bash
# Check out and bump the submodule chain to the tip of a branch.
#
#   scripts/sync-submodule-chain.sh [branch]        # default: confidential-asset
#
# The four repositories nest:
#
#   beldex-libapp-js
#     └── src/submodules/beldex-libapp-cpp
#           └── src/beldex-core-cpp
#                 └── contrib/beldex-core-custom
#
# A parent records a child by *commit*, not by branch, so a child has to be
# pushed before its parent can point at it. Run this after pushing a change
# anywhere in the chain: it walks down from the top, moving each recorded commit
# to the tip of `branch` on the remote, and then reports which repositories need
# a commit of their own to make that permanent.
#
# It never commits and never pushes -- that stays yours.
set -euo pipefail

BRANCH="${1:-confidential-asset}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ordered top-down: each entry's parent is created by the entry before it.
#   parent-relative-path : submodule-path : label
CHAIN=(
  ".:src/submodules/beldex-libapp-cpp:beldex-libapp-js -> beldex-libapp-cpp"
  "src/submodules/beldex-libapp-cpp:src/beldex-core-cpp:beldex-libapp-cpp -> beldex-core-cpp"
  "src/submodules/beldex-libapp-cpp/src/beldex-core-cpp:contrib/beldex-core-custom:beldex-core-cpp -> beldex-core-custom"
)

pending=()
for entry in "${CHAIN[@]}"; do
  rel="${entry%%:*}"; rest="${entry#*:}"
  sub="${rest%%:*}"; label="${rest#*:}"
  parent="$ROOT/$rel"

  echo "== $label"

  # All four repositories live side by side in the same organisation, so a
  # child's URL is its parent's origin with the repository name swapped.
  # Deriving it here means the chain resolves correctly even at a point where a
  # parent's committed .gitmodules still names the upstream it was forked from
  # -- which is the state each repository is in until its own fix is pushed.
  parent_origin="$(git -C "$parent" remote get-url origin)"
  url="${parent_origin%/*}/$(basename "$sub").git"
  git -C "$parent" config "submodule.$sub.url" "$url"
  # --remote follows `branch` from .gitmodules; set it explicitly for the same reason.
  git -C "$parent" config "submodule.$sub.branch" "$BRANCH"
  # Check out at the recorded commit first: a fresh submodule clone does not
  # necessarily have the branch ref yet, and --remote fails outright without it.
  git -C "$parent" submodule update --init -- "$sub"
  # Set the origin on the submodule itself rather than going through
  # `submodule sync`, which would copy the URL back out of the parent's
  # committed .gitmodules and undo the override above.
  git -C "$parent/$sub" remote set-url origin "$url"
  git -C "$parent/$sub" fetch --quiet origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
  git -C "$parent" submodule update --remote -- "$sub"

  echo "   now at $(git -C "$parent/$sub" rev-parse --short HEAD)  $(git -C "$parent/$sub" log -1 --format=%s)"
  # Compare the recorded gitlink against the checkout directly rather than via
  # `git diff`, whose stat cache goes stale the moment the parent itself is
  # re-checked-out a step earlier and would report a move that did not happen.
  recorded="$(git -C "$parent" rev-parse "HEAD:$sub" 2>/dev/null || echo none)"
  if [[ "$recorded" != "$(git -C "$parent/$sub" rev-parse HEAD)" ]]; then
    pending+=("$rel")
    echo "   ^ the recorded commit moved -- needs a commit in ${rel/./beldex-libapp-js}"
  fi
done

# Third-party submodules of the core (fmt, oxen-encoding and its Catch2) come
# along too. They are pinned by commit and are not part of the branch chain.
# Scoped deliberately to the core rather than run as a recursive update from the
# root: that would walk the chain again and reset every bump made above back to
# the commit its parent currently records.
echo "== third-party submodules"
git -C "$ROOT/src/submodules/beldex-libapp-cpp/src/beldex-core-cpp/contrib/beldex-core-custom" \
    submodule update --init --recursive >/dev/null
echo "   ok"

echo
if ((${#pending[@]})); then
  echo "Commit and push these, deepest first, then re-run:"
  for ((i=${#pending[@]}-1; i>=0; i--)); do echo "  ${pending[$i]/./.}"; done
else
  echo "Chain is in sync with $BRANCH."
fi
