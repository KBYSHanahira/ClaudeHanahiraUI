# Remote modes of Claude Code

A look-up for choosing and running Claude Code away from the person's own terminal. Every point here comes from the official docs as read on 2026-11-14; flags, plans and limits change, so open the page named for a section before relying on a detail, and say which version was checked (`claude --version`).

## Remote Control — https://code.claude.com/docs/en/remote-control.md

- Connects claude.ai/code or the Claude mobile app to a Claude Code session running on the person's machine. Code execution, files, MCP servers and project config stay local.
- Start it per session with `claude --remote-control` (short `--rc`), or `/remote-control` (`/rc`) inside a running session; `claude remote-control` runs a server mode for several sessions. It prints a URL and a QR code.
- For every session: the "Enable Remote Control for all sessions" option in `/config`, or the matching user setting. A project file can turn it off but not on; an organization can disable it.
- Needs a claude.ai subscription login (not an API key), and on Team or Enterprise an owner to allow it. It is not available when traffic goes to another base URL or when non-essential traffic is disabled.
- The machine and the `claude` process must stay running; closing the terminal takes the session offline. Over SSH, start it inside `tmux` or `screen`.
- Security: outbound HTTPS only, no inbound port; the transcript is held on Anthropic's servers while connected.
- Some terminal-only commands (such as `/plugin`, `/resume`) are not available from the remote side.

## Cloud sessions and teleport — https://code.claude.com/docs/en/claude-code-on-the-web.md

- A cloud session runs in an isolated, Anthropic-managed VM and keeps running after the person closes the laptop; it uses the account's usage limits.
- Connect GitHub once (the GitHub App during web setup, or `/web-setup` in the terminal). Start from the terminal with `claude --cloud "task"`: it uses the current directory's GitHub remote at the current branch, so push first.
- Send a follow-up to a running cloud session: `claude -p "message" --cloud <session-id>`.
- Bring a cloud session to the terminal: `claude --teleport` (a picker) or `claude --teleport <session-id>`, or `/teleport` inside a CLI session. It needs a clean working tree, a checkout of the same repository, the branch pushed, and the same claude.ai account. From the CLI the handoff is one way (cloud to local); the Desktop app's Open in menu can send a local session to the cloud.
- Background work stops when the environment expires after inactivity; earlier messages may be compacted and not carried over on teleport.

## Desktop SSH sessions — https://code.claude.com/docs/en/desktop.md

- Added in the Desktop app's environment selector as an SSH connection (`user@host` or a `~/.ssh/config` host). The CLI runs on the remote host; Desktop installs it there and keeps its helper under `~/.claude/remote/`.
- Skills are read from the remote host's `~/.claude/skills/`; plugins can be installed in the session and live on the host; the host's `~/.claude/settings.json` supplies settings such as the `env` block.
- Requirements include the SFTP subsystem on the host, `~/.claude/remote/` on a filesystem that allows executables, and free space in the home folder. `git` and `gh` on the host are set up by the person.
- The Desktop browser pane is not available to SSH sessions; a browser task there goes through Claude in Chrome on the person's machine (see the browser companion for reaching a dev server on the host).

## Headless runs — https://code.claude.com/docs/en/headless.md

- `claude -p "prompt"` (`--print`) runs once and exits: 0 on success, non-zero on failure.
- Allow exactly what the job needs: `--allowedTools "Read,Edit,Bash(git diff *)"`; choose a `--permission-mode` deliberately.
- Machine-readable output: `--output-format json` (or `stream-json` for streaming); `--json-schema '<schema>'` asks for structured output.
- Continue earlier work with `--continue` or `--resume <session-id>`; add instructions with `--append-system-prompt`.
- `--bare` skips hooks, skills, plugins, MCP servers and CLAUDE.md, and authenticates with an API key only; without it, a `-p` run loads the project's hooks and MCP servers, so run it only in a checkout you trust.
- Input can be piped in: `cat log.txt | claude -p "summarise the errors"`.
- Check the CLI reference (https://code.claude.com/docs/en/cli-reference.md) for flags not listed here, such as turn or budget limits, before using them.

## Running the CLI on a server yourself

- Install Claude Code on the server, sign in there, and run it inside `tmux new -s claude` so it survives a dropped SSH connection; reattach with `tmux attach -t claude`.
- The server's own `~/.claude/` holds its settings, skills and plugins; copying a plugin there means reloading it in the running session.
- Combine with Remote Control to reach that tmux session from the phone.

## Security — https://code.claude.com/docs/en/security.md

- Permission modes range from asking for each action to auto-review and no prompts; skipping prompts entirely is for a disposable container only.
- `deny` rules hold in every permission mode; deny reads of `.env` files and secret folders on any shared or remote machine.
- The Bash sandbox (`/sandbox`, see https://code.claude.com/docs/en/sandboxing.md) isolates the filesystem and network on macOS, Linux and WSL2.
- Untrusted content (web pages, issues, PR comments) is not piped into a session with broad permissions; review commands before approving them.
- Cloud sessions keep GitHub credentials off the VM; a cloud job that replies to PR comments acts as the person's account and can trigger comment-driven automation.
