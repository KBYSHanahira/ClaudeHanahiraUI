<div align="center">

# 🌸 Hanahira Claude UI

**Turn Claude Code into a dashboard you can read at a glance.**

An interface mod for Claude Code: a status band above the prompt, ring gauges, and agent cards.

[![Language: 日本語](https://img.shields.io/badge/lang-日本語-e8825f?style=for-the-badge)](README.md)
[![Language: English](https://img.shields.io/badge/lang-English-9b8cf7?style=for-the-badge)](README.en.md)

![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-9b8cf7?style=flat-square)
![Version](https://img.shields.io/badge/version-0.1.0-34c38f?style=flat-square)
![Interface mod](https://img.shields.io/badge/type-interface_mod-4aa3f0?style=flat-square)

[🇯🇵 日本語](README.md) ｜ **🇬🇧 English (this page)**

</div>

---

## ✨ Features

| | Feature | What it does |
| :-: | :-- | :-- |
| 📊 | **Status band** | Above the prompt: project name, git branch, a loading bar that sweeps while Claude works, elapsed time, state and a tool counter (`⚡ 8 tools`). |
| ▮▮▮ | **Context meter** | Context used as one big figure with a 30-block meter beside it, the one thing drawn large; what is left and the window's size follow. It turns red and breathes past 85%. |
| ⭕ | **Ring gauges** | 5-hour limit, 7-day limit and model speed as small rings. The limits say when they reset (e.g. `resets in 3h 20m`). |
| 💰 | **Totals** | Cost, tokens, time and model as a quiet row of figures; a value animates only at the moment it changes. |
| 🤖 | **Agent cards** | Background subagents as a row of cards. A finished card shows its check for about three seconds, then leaves. |
| 🧾 | **Transcript styling** | Your message as a card framed like the band. Every row (tool call, folded run, background task) has one layout: a kind tile, a coloured verb, the target (files in monospace), a status pill and the time. Deleting files with `rm` shows as a red **Delete** row. |
| ✏️ | **Code changes inline** | An Edit or Write shows its change right under its row: numbered lines, added ones on green, removed ones on red, a `⋯` where the patch skips lines, and `+N` / `−N` pills in place of `saved`. The full view (ctrl+o) keeps the engine's own. |
| 🎞️ | **Motion** | Only where work runs or something just changed. While a call runs, the pill's dots wave (or a light runs round the tile). When it finishes, the pill turns from running to its state with no pop: its colour changes, the dots gather where the check then writes itself, and an error's cross gives one short shake. The tile sends out one ripple, and a change's `+N` / `−N` count up from 0. A finished pill's icon keeps a slow breath. |
| 🛡️ | **Safety guard** | Blocks Bash commands that remove Compose volumes (`docker compose down -v` or `--volumes`, `docker-compose` too) and `ufw enable`. |

> **Honesty rule:** every word on an agent card is a real value. The model is what the API reported; the effort is what the engine sent; anything unknown is left out or reads `model pending`, never guessed. A per-agent cost is an **estimate** from the price table in `hooks/agents.ts`, marked `≈`.

### What it looks like

<div align="center">

<img src="docs/preview.png" alt="Hanahira Claude UI compact status band: agent cards, top-line chips, the context meter, two lines of stats" width="900">

*Drawn by the plugin's own SVG builders with sample numbers. Regenerate: `bun scripts/preview.ts`*

<img src="docs/preview-chat.svg" alt="Hanahira Claude UI transcript rows: your card, tool rows with kind tiles and status pills, an edit with its inline diff, a delete, a folded run, a running call, a task notification, an error" width="780">

*The transcript rows, the same way. Regenerate: `bun scripts/preview-chat.ts`*

</div>

#### What it looks like (sketch)

```text
┌─ spa  ⎇ main  ▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  45:30  ● working   ⚡ 8 tools ─┐
│  ◔ 15%            ◔ 4%                ◔ 22%                                    │
│  context 151k/1M  of 5-hour limit     of 7-day limit                           │
│                   resets in 3h 59m    resets in 2d 8h                          │
│  [ Cost ≈$46.22 ] [ Tokens 172M ] [ Time 45:30 ]                              │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Option 1: from the marketplace (recommended)

In the Claude Code **terminal** (not the desktop app's chat box):

```text
/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI
```

1. Answer `y` when asked to add the marketplace.
2. Pick a scope. **User scope** enables it in every session.
3. Installed once at user scope, sessions started by the desktop app on the same machine load it too.

> 🔒 For a **private** repository, the machine must be signed in to GitHub with access to it (`gh auth login` or an SSH key).

### Option 2: upload the ZIP / `.plugin` file

**Settings → Plugins → Upload a plugin**, then choose `hanahira-claude-ui.zip` (or `.plugin`).

### Option 3: point at the folder (development, trying it out)

```bash
claude --plugin-dir /path/to/hanahira-claude-ui
```

**Hot reload on an SSH host (Desktop).** Desktop syncs an empty `hanahira-claude-ui` into every session, and it loads before a `--plugin-dir` of the same name, so the repo cannot be loaded as it is. `scripts/dev.ts` keeps a renamed copy, `hanahira-claude-ui-dev`, in `~/.claude/hanahira-dev/` in sync with every save:

1. In `~/.claude/settings.json`, add `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/root/.claude/hanahira-dev/hanahira-claude-ui-dev", "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1" }` (your home in place of `/root`) and set `"hanahira-claude-ui-ssh@hanahira-ssh": false` under `enabledPlugins`, or two bands are drawn.
2. Run `bun scripts/dev.ts` and leave it running, then start a new session once.
3. Each save reloads the mod in the open session (an edit Claude makes reloads when its turn ends). To stop, remove the two `env` keys and turn `-ssh` back on.

Or keep it on with an environment variable:

```bash
export CLAUDE_CODE_PLUGIN_DIRS=/path/to/hanahira-claude-ui
```

### 🌐 Using it over SSH

With Claude Code Desktop over SSH, Claude Code itself runs on the **remote machine**. Desktop syncs your local plugin to the remote, but **without its `hooks/` folder**, and that empty same-named copy overrides a real install on the remote, so a normal install shows nothing.

So the remote gets its own copy under a **different name** (`hanahira-claude-ui-ssh`). **On the remote machine**, clone this repository and run:

```bash
git clone https://github.com/KBYSHanahira/ClaudeHanahiraUI.git
cd ClaudeHanahiraUI
scripts/install-ssh.sh
```

Then open a **new session** in Desktop (open sessions do not pick it up). After a `git pull`, run `scripts/install-ssh.sh` again. Using it on your local machine needs none of this; Option 1 works as is.

## 🔄 Updating

When a new version comes out, update **the same way you installed**. Then open a **new session** (open sessions do not pick up changes).

### 🧰 One command (`update.sh`)

No need to remember the commands: this one line updates a marketplace install (on an SSH host with a clone, `scripts/update.sh` also runs `git pull` and `install-ssh.sh`).

```bash
curl -fsSL https://raw.githubusercontent.com/KBYSHanahira/ClaudeHanahiraUI/main/scripts/update.sh | bash
```

### Installed from the marketplace (Option 1)

In the Claude Code **terminal**, run these two in order:

```text
/plugin marketplace update hanahira-plugins
/plugin update hanahira-claude-ui@hanahira-plugins
```

Or open `/plugin`, go to **Marketplaces** → `hanahira-plugins` → **Update**, then **Installed** → `hanahira-claude-ui` → **Update**.

### Installed from a ZIP / `.plugin` (Option 2)

Get the latest ZIP and upload it again under **Settings → Plugins → Upload a plugin** (it replaces the old one).

### Pointing at a folder (Option 3)

Just `git pull` in that folder:

```bash
cd /path/to/hanahira-claude-ui
git pull
```

### Over SSH

**On the remote machine**, update the clone and run the install script again:

```bash
cd ClaudeHanahiraUI
git pull
scripts/install-ssh.sh
```

> 💡 The version is the `version` field in `.claude-plugin/plugin.json`. If nothing changes after updating, quit and reopen Claude Code once.

---

## 🚀 Usage

There is **nothing to configure**. Open Claude Code and the band appears above the prompt.

| Element | How to read it |
| :-- | :-- |
| **Loading bar** | A glow sweeps while Claude works; a quiet line when idle. |
| **`⚡ N tools`** | Tool calls made in this prompt. Flashes when it grows. |
| **Context meter** | Context used, what is left and the window (e.g. `11% ▮▮▮▯▯ context · 889k left · 1M window`). |
| **5-hour / 7-day rings** | Share of each usage limit used, and the time until it resets. Shown only when the account reports rate limits. |
| **Cost** | The session total the engine reports (marked `≈`). |
| **Tokens** | Total tokens counted since the plugin loaded, subagents included, with cache reads and writes. |
| **Time** | Total time spent working. |
| **Agent cards** | A row above the band's frame. A running card pulses; a finished one flashes green and leaves. |


> **Why the token count looks huge:** Tokens adds up every model response's input, output, cache reads and cache writes. In a long session with a large context, the same context is re-read from the cache on every response, so the total reaches hundreds of millions. A cache read costs far less than ordinary input.

---

## 🎛️ Customise

- `THEME.compact` in `hooks/register.tsx` (on by default) draws the stats as two aligned rows of one-line gauges and figures, about half the height; `false` brings back the full cards.
- Colours, icons, ring size, bar length, number of agent cards and how long a finished card stays are in `THEME` and `RING` at the top of `hooks/register.tsx`.
- The tool-row look is in `hooks/chat.ts`; agent cards and the price table in `hooks/agents.ts`; icons in `hooks/icons.ts`.
- Edit the blocked commands in `DANGEROUS` in `hooks/register.tsx`.
- The limit rings appear only when the account reports rate limits.

## 🧪 Requirements and notes

- Animation needs a surface that plays SVG (SMIL); elsewhere everything is static.
- This is an interface mod (`modules` in `hooks/hooks.json`) and needs a Claude Code build that supports mods.
- A change hot-reloads when a turn ends. If it does not, look for a `reload failed` line in the transcript.

## 🛠️ Development

```bash
claude plugin validate /path/to/hanahira-claude-ui
claude --plugin-dir /path/to/hanahira-claude-ui
```

Pure functions live in `hooks/chat.ts` and friends and have tests (`hooks/*.test.ts`): run them with `bun test` (`scripts/test-preload.ts` stands in for the engine's modules; a CLI that has `claude plugin test` can run them there too). Layout:

```text
.claude-plugin/   plugin.json / marketplace.json
hooks/
  hooks.json      module registration
  register.tsx    the hooks (band, transcript, agents)
  chat.ts         pure display helpers (SVG, formats, the transcript's MOTION)
  agents.ts       agent cards, price table
  icons.ts        the line-icon set
  spinner.tsx     running spinner Desktop turns itself (a Client)
  shimmer.tsx     the working bar's light, moved by Desktop (a Client)
scripts/
  test-preload.ts engine stand-ins for bun test
  preview.ts      draws docs/preview.svg
  preview-chat.ts draws docs/preview-chat.svg
  dev.ts          live renamed copy for hot reload
types/index.d.ts  the shape of the state ($.state)
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
