#!/usr/bin/env bash
# Update Hanahira Claude UI with one command.
#
#   scripts/update.sh            # pick the right way for this machine
#   CLAUDE=/path/to/claude scripts/update.sh
#
# - Installed from the marketplace: refreshes the marketplace and updates the plugin.
# - SSH host (has ~/.claude/hanahira-ssh): git pull in this clone, then install-ssh.sh.
# Afterwards start a NEW session; open sessions do not pick up the change.
set -euo pipefail

# Piped from curl there is no script path, hence no clone to pull.
SRC="$( [ -n "${BASH_SOURCE[0]:-}" ] && cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || true )"
PLUGIN=hanahira-claude-ui
MARKET=hanahira-plugins
SSH_DIR="${HANAHIRA_SSH_DIR:-$HOME/.claude/hanahira-ssh}"

CLAUDE="${CLAUDE:-$(command -v claude || true)}"
CLAUDE="${CLAUDE:-$(ls -d "$HOME"/.claude/remote/ccd-cli/* 2>/dev/null | sort -V | tail -1 || true)}"

if [ -d "$SSH_DIR" ] && [ -n "$SRC" ] && [ -d "$SRC/.git" ]; then
  echo "SSH install detected: pulling and reinstalling..."
  git -C "$SRC" pull --ff-only
  exec "$SRC/scripts/install-ssh.sh"
fi

[ -x "${CLAUDE:-}" ] || { echo "claude CLI not found; set CLAUDE=/path/to/claude" >&2; exit 1; }
"$CLAUDE" plugin marketplace update "$MARKET"
"$CLAUDE" plugin update "$PLUGIN@$MARKET"
echo "Done. Start a new session to use the new version."
