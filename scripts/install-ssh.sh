#!/usr/bin/env bash
# Install Hanahira Claude UI on a machine that Claude Code Desktop reaches over SSH.
#
# Desktop syncs a plugin to the SSH host without its hooks/ folder, and that empty copy
# (same name) overrides anything installed on the host. So the host gets its own copy
# under a different name, hanahira-claude-ui-ssh, which the synced copy cannot override.
# The synced copy does bring skills/, so this copy carries only the hooks; a second set of
# skills would list every Hanahira skill twice in an SSH session. Without a synced copy, or
# with one stuck on an older version, HANAHIRA_SSH_SKILLS=1 adds skills/ to this copy, and
# later runs keep them until HANAHIRA_SSH_SKILLS=0.
#
# Run it ON THE SSH HOST, from a clone of this repository:
#   scripts/install-ssh.sh            # install or refresh
#   HANAHIRA_SSH_SKILLS=1 scripts/install-ssh.sh
#   CLAUDE=/path/to/claude scripts/install-ssh.sh
# Re-run it after every `git pull`. Then start a new session in Desktop.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME=hanahira-claude-ui
SSH_NAME=$NAME-ssh
MARKET=hanahira-ssh
DEST="${HANAHIRA_SSH_DIR:-$HOME/.claude/hanahira-ssh}"

# Desktop runs its own CLI on the host; prefer the newest one, else `claude` on PATH.
CLAUDE="${CLAUDE:-$(ls -d "$HOME"/.claude/remote/ccd-cli/* 2>/dev/null | sort -V | tail -1 || true)}"
CLAUDE="${CLAUDE:-$(command -v claude || true)}"
[ -x "${CLAUDE:-}" ] || { echo "claude CLI not found; set CLAUDE=/path/to/claude" >&2; exit 1; }

P="$DEST/$SSH_NAME"
# Skills stay as the last install had them unless the caller says otherwise.
SKILLS="${HANAHIRA_SSH_SKILLS:-$([ -d "$P/skills" ] && echo 1 || echo 0)}"

# A real copy, not links: the CLI refuses a plugin whose files resolve outside its folder.
rm -rf "$DEST"
mkdir -p "$P/.claude-plugin" "$P/hooks" "$P/types" "$DEST/.claude-plugin"
cp "$SRC"/hooks/*.ts "$SRC"/hooks/*.tsx "$SRC"/hooks/hooks.json "$P/hooks/"
rm -f "$P"/hooks/*.test.ts "$P"/hooks/*.test.tsx
cp "$SRC/types/index.d.ts" "$P/types/"
[ "$SKILLS" = 1 ] && cp -r "$SRC/skills" "$P/"
# Values in $.state belong to the plugin by name, so the name inside the code follows it.
sed -i "s/$NAME/$SSH_NAME/g" "$P/hooks/register.tsx" "$P/types/index.d.ts"

cat > "$P/.claude-plugin/plugin.json" <<J
{
  "name": "$SSH_NAME",
  "version": "$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SRC/.claude-plugin/plugin.json" | head -1)",
  "description": "Hanahira UI for SSH sessions (installed on the host itself)",
  "author": { "name": "Hanahira" },
  "types": "./types/index.d.ts"
}
J
cat > "$DEST/.claude-plugin/marketplace.json" <<J
{
  "name": "$MARKET",
  "owner": { "name": "Hanahira" },
  "plugins": [ { "name": "$SSH_NAME", "source": "./$SSH_NAME", "description": "Hanahira UI, installed on the SSH host" } ]
}
J

cd /tmp
"$CLAUDE" plugin uninstall "$SSH_NAME@$MARKET" --scope user >/dev/null 2>&1 || true
# The copy installed by v1.10.0 under the name HanahiraClaudeUI, which would draw a second band.
"$CLAUDE" plugin uninstall "HanahiraClaudeUI-ssh@$MARKET" --scope user >/dev/null 2>&1 || true
"$CLAUDE" plugin marketplace remove "$MARKET" >/dev/null 2>&1 || true
"$CLAUDE" plugin marketplace add "$DEST"
"$CLAUDE" plugin install "$SSH_NAME@$MARKET" --scope user
echo "Done. Start a new session in Desktop."
