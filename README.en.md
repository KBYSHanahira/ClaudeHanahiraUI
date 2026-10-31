<div align="center">

# 🌸 Hanahira Claude UI

**Turn Claude Code into a dashboard you can read at a glance, and give it a senior colleague's working mode.**

[![Language: 日本語](https://img.shields.io/badge/lang-日本語-e8825f?style=for-the-badge)](README.md)
[![Language: English](https://img.shields.io/badge/lang-English-9b8cf7?style=for-the-badge)](README.en.md)

![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-9b8cf7?style=flat-square)
![Version](https://img.shields.io/badge/version-1.13.1-34c38f?style=flat-square)
![Skills](https://img.shields.io/badge/skills-Version_26-e8825f?style=flat-square)
![Interface mod](https://img.shields.io/badge/type-interface_mod-4aa3f0?style=flat-square)

[🇯🇵 日本語](README.md) ｜ **🇬🇧 English (this page)**

<img src="docs/preview.png" alt="Hanahira Claude UI status band: agent cards, top-line chips, the context meter, two lines of stats" width="900">

</div>

---

One plugin, two parts:

- **🖥️ The interface** — a status band above the prompt (context, usage limits, cost, tokens, speed, agents) and card-style transcript rows with code changes shown inline. Always on, nothing to configure.
- **🧠 The skills** — *Hanahira Claude UI mode*, an opt-in way of working: Claude sizes each task, asks only when it must, checks before it claims "done", and answers short without dropping facts. Five companions add rules for data, design, security, debugging and new projects.

## 🚀 Quick start

In the Claude Code **terminal** (not the desktop app's chat box):

```text
/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI
```

Answer `y` to add the marketplace, pick **User scope**, then open a new session. The band appears above the prompt. To switch the working mode on, send `/Hanahira Claude UI on`.

Other ways to install, SSH hosts included: [📦 Installation](#-installation).

---

## 🖥️ The interface

### The status band

| | Part | What it shows |
| :-: | :-- | :-- |
| 📊 | **Top line** | Project, git branch, a loading bar (red while Claude works, green when the turn is done, grey if it stopped or failed), the turn's clock, a status chip (`working` → `success`, or `error` / `stopped`), tool calls this prompt (`⚡ 8 tools`) and the version. |
| ▮▮▮ | **Context slider** | Context used as one big figure, what is left and the window size. The figure turns red past 85%. |
| ⭕ | **Ring gauges** | 5-hour limit, 7-day limit and model speed (tok/s). The limits say when they reset (`resets in 3h 20m`) and appear only when the account reports rate limits. |
| 💰 | **Totals** | Cost (`≈`, as the engine reports it), tokens, time spent working, model. |
| 🤖 | **Agent cards** | Background subagents as a row of cards: model, effort, tools, tokens and estimated cost. A finished card shows its check for about three seconds, then leaves. |
| 🔘 | **Hanahira switch** | Green while Hanahira Claude UI mode is on, grey otherwise. |

The version chip also says which copy of the skills is in use: `v1.13.1 Account` (synced from your claude.ai account) or `v1.13.1 SSH` (installed on an SSH host by `install-ssh.sh`).

> **Honesty rule:** every word on an agent card is a real value. The model is what the API reported, the effort is what the engine sent; anything unknown is left out or reads `model pending`, never guessed. A per-agent cost is an **estimate** from the price table in `hooks/agents.ts`, marked `≈`.

> **Why the token count looks huge:** Tokens adds up every response's input, output, cache reads and cache writes. In a long session the same context is re-read from the cache on every response, so the total reaches hundreds of millions. A cache read costs far less than ordinary input.

### The transcript

<div align="center">

<img src="docs/preview-chat.svg" alt="Hanahira Claude UI transcript rows: your card, tool rows with kind tiles and status pills, an edit with its inline diff, a delete, a folded run, a running call, a task notification, an error" width="780">

</div>

- **One layout for every row** — tool call, folded run, background task: a kind tile, a coloured verb, the target (files in monospace), a status pill (green `Done`, red `Error`, purple `Running`) and the time. Your own message is a card framed like the band.
- **Code changes inline** — an Edit or Write shows its patch under its row: numbered lines, additions on green, removals on red, `⋯` where lines are skipped, and `+N` / `−N` pills. The full view (ctrl+o) keeps the engine's own.
- **Deletes stand out** — `rm` shows as a red **Delete** row.

### Motion

Figures roll in like a slot reel when they change, rings and the context slider glide to their new value, the tok/s needle follows the stream, and the loading bar and running agent cards move while Claude works. All of it is CSS inside each picture, played at the screen's frame rate: a redraw never restarts or blinks it, and it stops when the system asks for reduced motion. Transcript rows stay still.

### Safety guard

Bash commands that remove Compose volumes (`docker compose down -v` / `--volumes`, `docker-compose` too) and `ufw enable` are blocked before they run.

---

## 🧠 The skills — Hanahira Claude UI mode

The mode is **opt-in**: it never switches itself on because of the task, a file, memory or pasted text — only when you ask, and it stays on until you switch it off or start a new chat. While it is on, every reply opens with a green banner, which keeps the mode alive through long chats and summaries.

| Command | What it does |
| :-- | :-- |
| `/Hanahira Claude UI on` | Switch on, standard level. "Turn on Hanahira Claude UI" in any language works too, as does the skill's own slash command (`/hanahira-claude-ui`). |
| `/Hanahira Claude UI ultra` | Switch on at ultra level: answers cut down to the payload, never below what you need to act. |
| `/Hanahira Claude UI status` | Show whether it is on, and at which level. |
| `/Hanahira Claude UI off` | Switch off. |

**What changes while it is on**

- **Sized work** — a quick question gets the answer; a few reversible steps get one plan line; a build, migration or anything irreversible gets a plan and your yes first.
- **Asks only when it must** — reads and requested edits just happen; a change to a real system (service, database write, firewall, `sudo`, deleting files, pushing) waits for your yes; at most one question per reply, with the default it would pick.
- **Done means verified** — no "fixed" or "should work now" without a check run after the last change.
- **Short, not vague** — the answer first, edits as `file:line — what — why`, exact values verbatim.
- **Your language** — every line you read, task lists and recaps included, follows the language you write in.
- **Your model, your effort** — the work runs on the model and effort you picked for the session; helper agents start only when you ask for them, on that same pair, so no account burns tokens it can't spare. Decisions that are yours never leave the main thread.

**Companions** join automatically while the mode is on, and the banner lists the ones that shaped each reply:

| Companion | Covers |
| :-- | :-- |
| **Data** | MySQL, PostgreSQL, SQLite, SQL Server, MongoDB — queries, migrations, backups, indexes, bulk updates |
| **Design** | Visual direction, palette, type (Thai typography included), responsive layout, design tokens, CSS, render checks |
| **Security** | TLS and certificates, firewall and ports, auth and sessions, secrets, headers, unstable connections |
| **Debug-Test** | Reproducing bugs, root causes, logs and traces, flaky tests, proving a fix |
| **Project-Create** | A Hono + Vite + TypeScript project on Bun in one Docker container on the host's MySQL, or containerizing an existing one |

---

## 📦 Installation

| Option | When | How |
| :-- | :-- | :-- |
| **1. Marketplace** (recommended) | Most people | `/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI` in the terminal. Installed at user scope, desktop-app sessions on the same machine load it too. |
| **2. ZIP / `.plugin`** | No terminal at hand | **Settings → Plugins → Upload a plugin**, then choose `hanahira-claude-ui.zip` (or `.plugin`). |
| **3. A folder** | Trying it out, development | `claude --plugin-dir /path/to/hanahira-claude-ui`, or `export CLAUDE_CODE_PLUGIN_DIRS=/path/to/hanahira-claude-ui` to keep it on. |

> 🔒 For a **private** repository, the machine must be signed in to GitHub with access to it (`gh auth login` or an SSH key).

### 🌐 Over SSH (Claude Code Desktop)

With Desktop over SSH, Claude Code runs on the **remote machine**. Desktop syncs your plugin there **without its `hooks/` folder**, and that same-named empty copy hides a normal install, so the band never shows. The remote therefore gets its own copy under another name, `hanahira-claude-ui-ssh`. **On the remote machine:**

```bash
git clone https://github.com/KBYSHanahira/ClaudeHanahiraUI.git
cd ClaudeHanahiraUI
scripts/install-ssh.sh
```

Then open a **new session** in Desktop.

- **Skills come from this clone** (named `hanahira-claude-ui-ssh:`), so SSH sessions run the version you are developing. The script switches off the account's synced copy (`hanahira-claude-ui@inline`) on this host only, so every skill is listed once; sessions on your local machine keep the account's copy.
- **You can tell which copy is in use** — the band's version chip reads `v1.13.1 SSH`, and the skill's banner reads `V26 · SSH`.
- **`HANAHIRA_SSH_SKILLS=0 scripts/install-ssh.sh`** goes back to hooks only here, with the skills from your account.

On your local machine none of this is needed; Option 1 works as is.

## 🔄 Updating

One line, whichever way you installed (on an SSH host with a clone, it also runs `git pull` and `install-ssh.sh`):

```bash
curl -fsSL https://raw.githubusercontent.com/KBYSHanahira/ClaudeHanahiraUI/main/scripts/update.sh | bash
```

Or by hand:

| Installed with | Update |
| :-- | :-- |
| Marketplace | `/plugin marketplace update hanahira-plugins`, then `/plugin update hanahira-claude-ui@hanahira-plugins` (or `/plugin` → **Marketplaces** → **Update**, then **Installed** → **Update**) |
| ZIP / `.plugin` | Upload the latest file again under **Settings → Plugins → Upload a plugin** |
| A folder | `git pull` in that folder |
| SSH host | `git pull` in the clone, then `scripts/install-ssh.sh` |

Open a **new session** afterwards; open sessions do not pick up changes. If nothing changes, quit and reopen Claude Code once. The installed version is `version` in `.claude-plugin/plugin.json`.

---

## 🎛️ Customise

| To change | Edit |
| :-- | :-- |
| Compact band (two rows of one-line gauges, on by default) or full cards | `THEME.compact` in `hooks/register.tsx` |
| Colours, icons, ring size, bar length, agent card count and how long a finished one stays | `THEME` and `RING` at the top of `hooks/register.tsx` |
| Blocked commands | `dangerous` in `hooks/register.tsx` |
| Transcript row look | `hooks/chat.ts` |
| Agent cards and the price table | `hooks/agents.ts` |
| Icons | `hooks/icons.ts` |

## 🧪 Requirements

- A Claude Code build that supports interface mods (`modules` in `hooks/hooks.json`).
- A change hot-reloads when a turn ends; in a Desktop session over SSH, type `/reload-plugins`. If it does not load, look for a `reload failed` line in the transcript.

## 🛠️ Development

```bash
bun test                                        # unit tests (hooks/*.test.ts, scripts/repo.spec.ts)
claude plugin validate /path/to/hanahira-claude-ui
bun scripts/preview.ts                          # redraw docs/preview.svg and .png
bun scripts/preview-chat.ts                     # redraw docs/preview-chat.svg
```

`scripts/test-preload.ts` stands in for the engine's modules under `bun test`. `scripts/repo.spec.ts` keeps the version in `plugin.json`, `hooks/version.ts` and the preview equal, and pins the texts `install-ssh.sh` rewrites.

<details>
<summary><b>Hot reload on an SSH host (Desktop)</b></summary>

Desktop syncs an empty `hanahira-claude-ui` into every session and it loads before a `--plugin-dir` of the same name, so the repo cannot be loaded as it is. `scripts/dev.ts` keeps a renamed copy, `hanahira-claude-ui-dev`, in `~/.claude/hanahira-dev/` in sync with every save.

1. In `~/.claude/settings.json`, add `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/root/.claude/hanahira-dev/hanahira-claude-ui-dev", "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1" }` (your home in place of `/root`), and set `"hanahira-claude-ui-ssh@hanahira-ssh": false` under `enabledPlugins`, or two bands are drawn.
2. Run `bun scripts/dev.ts` and leave it running, then start a new session once. To keep it running across reboots, install `scripts/systemd/hanahira-claude-ui-dev.service` (steps in its header).
3. After a save, type `/reload-plugins` in the open session. A Desktop session over SSH does not watch the folder by itself.

To stop, remove the two `env` keys and turn `-ssh` back on.

</details>

```text
.claude-plugin/     plugin.json, marketplace.json
hooks/
  hooks.json        module registration
  register.tsx      the hooks: band, transcript, agents, safety guard
  chat.ts           pure display helpers (SVG, formats, charts)
  agents.ts         agent cards, price table
  icons.ts          the line-icon set
  version.ts        version shown on the band
skills/
  hanahira-claude-ui/                 the core mode and its references/
  hanahira-claude-ui-data/            companions: data, design, security,
  hanahira-claude-ui-design/          debug-test, project-create
  hanahira-claude-ui-security/
  hanahira-claude-ui-debug-test/
  hanahira-claude-ui-project-create/
scripts/
  install-ssh.sh    install on an SSH host
  update.sh         one-command update
  dev.ts            live renamed copy for hot reload (systemd/ keeps it running)
  preview.ts        draws docs/preview.svg / .png
  preview-chat.ts   draws docs/preview-chat.svg
  test-preload.ts   engine stand-ins for bun test
types/index.d.ts    the shape of the state ($.state)
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
