<div align="center">

# 🌸 Hanahira Claude UI

**Turn Claude Code into a dashboard you can read at a glance.**

An interface mod for Claude Code: a status band above the prompt, ring gauges, agent cards, and a candlestick chart of the lines of code you add and remove.

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
| ⭕ | **Ring gauges** | Context, 5-hour limit and 7-day limit as rings. The limits say when they reset (e.g. `resets in 3h 20m`). |
| 💰 | **Total cards** | Cost, Tokens and Time as cards; a value animates only at the moment it changes. |
| 📈 | **Code chart** | One candlestick per prompt that changed files: the net lines added or removed, drawn like a stock chart. |
| 🤖 | **Agent cards** | Background subagents as a row of cards. A finished card shows its check for about three seconds, then leaves. |
| 🧾 | **Transcript styling** | Your message as a card; tool rows with a round icon, coloured verb, status and duration; numbered diff cards. |
| 🎞️ | **Motion** | Only where a value really changes or work is running. Unchanged figures stay still. |
| 🛡️ | **Safety guard** | Blocks the Bash commands `docker compose down -v` and `ufw enable`. |

> **Honesty rule:** every word on an agent card is a real value. The model is what the API reported; the effort is what the engine sent; anything unknown is left out or reads `model pending`, never guessed. A per-agent cost is an **estimate** from the price table in `hooks/agents.ts`, marked `≈`.

### What it looks like (sketch)

```text
┌─ spa  ⎇ main  ▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  45:30  ● working   ⚡ 8 tools ─┐
│  ◔ 15%            ◔ 4%                ◔ 22%             ┌ Code · net lines ──┐ │
│  context 151k/1M  of 5-hour limit     of 7-day limit    │    ▂ ▅ ▇ █   +207 │ │
│                   resets in 3h 59m    resets in 2d 8h   └────────────────────┘ │
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

Or keep it on with an environment variable:

```bash
export CLAUDE_CODE_PLUGIN_DIRS=/path/to/hanahira-claude-ui
```

### 🌐 Using it over SSH

Over SSH, Claude Code itself runs on the **remote machine**, so the mod must be **installed on the remote machine** too; installing it only on your local machine does nothing. On the remote, use Option 1 or Option 3:

```bash
scp -r ./hanahira-claude-ui user@host:~/plugins/
# then on the remote
claude --plugin-dir ~/plugins/hanahira-claude-ui
```

---

## 🚀 Usage

There is **nothing to configure**. Open Claude Code and the band appears above the prompt.

| Element | How to read it |
| :-- | :-- |
| **Loading bar** | A glow sweeps while Claude works; a quiet line when idle. |
| **`⚡ N tools`** | Tool calls made in this prompt. Flashes when it grows. |
| **Context ring** | Context used, and tokens / window (e.g. `151k/1M`). |
| **5-hour / 7-day rings** | Share of each usage limit used, and the time until it resets. Shown only when the account reports rate limits. |
| **Cost** | The session total the engine reports (marked `≈`). |
| **Tokens** | Total tokens counted since the plugin loaded, subagents included, with cache reads and writes. |
| **Time** | Total time spent working. |
| **Code · net lines** | See below. |
| **Agent cards** | A row above the band's frame. A running card pulses; a finished one flashes green and leaves. |

### 📈 Reading the code chart

- **One candle = one prompt that changed files** (a prompt with no edits draws none)
- **The vertical axis = net lines**: lines added minus lines removed, accumulated over the session
- 🟩 **green** = up　🟥 **red** = down　🟨 **amber** = flat
- **Wicks** = the lowest and highest the net reached during that prompt
- The number at the top right (e.g. `+207`) is the current net
- The data is counted from the Edit / Write results (the patches), subagents' edits included
- The latest 24 candles are shown

> **Why the token count looks huge:** Tokens adds up every model response's input, output, cache reads and cache writes. In a long session with a large context, the same context is re-read from the cache on every response, so the total reaches hundreds of millions. A cache read costs far less than ordinary input.

---

## 🎛️ Customise

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

Pure functions live in `hooks/chat.ts` and friends and have tests (`hooks/*.test.ts`). Layout:

```text
.claude-plugin/   plugin.json / marketplace.json
hooks/
  hooks.json      module registration
  register.tsx    the hooks (band, transcript, agents)
  chat.ts         pure display helpers (SVG, formats, chart)
  agents.ts       agent cards, price table
  icons.ts        the line-icon set
types/index.d.ts  the shape of the state ($.state)
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
