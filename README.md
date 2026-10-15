# hanahira-claude-ui

A Claude Code plugin that makes the interface easier to read and shows more at a glance.

- **Band above the prompt**: project name and git branch, an animated loading bar that sweeps while Claude works (a quiet track when idle), time, state and a labelled tool counter (`⚡ 8 tools`, flashes when it grows)
- **Stat rings**: context, 5-hour limit and 7-day limit (the limits say when they reset, e.g. `resets in 3h 20m`); a ring grows to its new value and breathes near full
- **Icons**: one set of line icons drawn for the plugin (terminal, file, pencil, search, bot, globe, chip, clock, calendar, coin, layers, stopwatch, branch, bolt ...), centred in tool badges, rings, cards and pills; where SVG cannot be drawn, plain glyphs stand in
- **Agent strip** (every word is the real value or absent, never a guess: the model is what the API reported, the effort is what the engine sent with the request, an unknown model reads `model pending` and has no price; the per-agent cost is an estimate from the price table in `hooks/agents.ts`, marked ≈): background agents as a row of cards just above the band's frame: pixel avatar, task, weight tag + model, tools · tokens · cost · time, status mark and a bar. A new card bounces in; a running one pulses and sweeps its bar; a finished one flashes its border and shows how long it took; a finished card shows its check for about three seconds, then leaves
- **Total cards**: overall cost, tokens and running time; a card's value rises into place and its border flashes when it changes
- **Transcript**: your message as a framed card; tool rows with a round icon, coloured verb, status pill and duration; numbered diff cards; an end-of-turn pill
- **Motion**: only where a value really changes or work is running (a running tool's icon pings, `working` shows travelling dots, the status dot ripples). Redrawing an unchanged figure stays still. Needs a surface that plays SVG (SMIL); elsewhere everything is simply static
- **Live figures**: the clock, tokens, cost and context update as Claude works (every second, and the moment each model response lands)
- **Safety guard**: blocks the Bash commands `docker compose down -v` and `ufw enable` (edit `DANGEROUS` in `hooks/register.tsx`)

## Install

Type this in the Claude Code terminal (not the desktop app's chat box):

```
/plugin install hanahira-claude-ui --marketplace <owner>/<repo>
```

Answer `y` to add the marketplace, then pick a scope (user scope = every session). Installed once at user scope, sessions started by the desktop app on the same machine load it too.

For a private repository the installer must be signed in to GitHub with access to `<owner>/<repo>` (`gh auth login` or an SSH key).

You can also upload `hanahira-claude-ui.zip` (or `.plugin`) from Settings → Plugins → Upload a plugin.

## Customise

Colours, icons and ring size are in `THEME` and `RING` at the top of `hooks/register.tsx`; the tool-row look is in `hooks/chat.ts`.

- Cost is the session total the engine reports; tokens and running time are counted since the plugin loaded (a subagent's tokens included)
- The limit rings appear only when the account reports rate limits

## Develop

```
claude --plugin-dir /path/to/hanahira-claude-ui
claude plugin validate /path/to/hanahira-claude-ui
```

Pure functions live in `hooks/chat.ts` and have tests (`hooks/*.test.ts`); run them with `claude plugin test` on a build that has the command.
