#!/usr/bin/env bash
# Install Hanahira Claude UI on a machine that Claude Code Desktop reaches over SSH.
#
# Desktop syncs a plugin to the SSH host without its hooks/ folder, and that empty copy
# (same name) overrides anything installed on the host. So the host gets its own copy
# under a different name, hanahira-claude-ui-ssh, which the synced copy cannot override.
# The synced copy brings skills/ too. In an SSH session the skills should be this clone's (the
# version being developed), so this copy carries skills/ and the synced one is switched off on
# this host only: Desktop hands it to the CLI as --plugin-dir, which makes it
# hanahira-claude-ui@inline, and enabledPlugins in this host's user settings can turn that off.
# Local sessions read their own settings, so they keep the account's copy. Every Hanahira skill
# is then listed once, and the band's version chip says which copy it is (SSH or Account).
# HANAHIRA_SSH_SKILLS=0 goes back to hooks only here, with the account's skills switched on again.
#
# Run it ON THE SSH HOST, from a clone of this repository:
#   scripts/install-ssh.sh            # install or refresh
#   HANAHIRA_SSH_SKILLS=0 scripts/install-ssh.sh
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

SKILLS="${HANAHIRA_SSH_SKILLS:-1}"

# A real copy, not links: the CLI refuses a plugin whose files resolve outside its folder.
rm -rf "$DEST"
mkdir -p "$P/.claude-plugin" "$P/hooks" "$P/types" "$DEST/.claude-plugin"
cp "$SRC"/hooks/*.ts "$SRC"/hooks/*.tsx "$SRC"/hooks/hooks.json "$P/hooks/"
rm -f "$P"/hooks/*.test.ts "$P"/hooks/*.test.tsx
cp "$SRC/types/index.d.ts" "$P/types/"
if [ "$SKILLS" = 1 ]; then
  cp -r "$SRC/skills" "$P/"
  # The banner names the copy too, so a reply shows where its rules came from. Same widths.
  sed -i -e 's/^\(+ ╭─ (( ^w^ )) Hanahira Claude UI V[0-9]*\) · ● ACTIVE/\1 · SSH · ● ACTIVE/' \
    -e 's/┃ Version \([0-9]*\) · SKILL  /┃ Version \1 · SSH    /' "$P/skills/$NAME/SKILL.md"
  sed -i "/SKILLS_FROM/s/= 'Account'/= 'SSH'/" "$P/hooks/version.ts"
fi
# Values in $.state belong to the plugin by name, so the name inside the code follows it. Only
# the quoted name: the skills keep theirs (hanahira-claude-ui*) in either copy, and the pattern
# that recognises them must not become -ssh, or the band never sees the mode switch on.
sed -i "s/'$NAME'/'$SSH_NAME'/g" "$P/hooks/register.tsx" "$P/types/index.d.ts"

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
# The account's synced copy: off on this host while this copy has the skills, on otherwise.
if [ "$SKILLS" = 1 ]; then
  "$CLAUDE" plugin disable "$NAME@inline" --scope user >/dev/null
  echo "Skills: in this copy ($SSH_NAME:); the account's copy is off in SSH sessions on this host"
else
  "$CLAUDE" plugin enable "$NAME@inline" --scope user >/dev/null 2>&1 || true
  echo "Skills: from the account's synced copy ($NAME:)"
fi
echo "Done. Start a new session in Desktop."
