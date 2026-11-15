---
name: "hanahira-claude-ui-automation"
description: Hanahira Claude UI companion for scripts and scheduled jobs — shell and Python scripts that run unattended, cron and systemd timers, Windows Task Scheduler, idempotent and re-runnable jobs, locking, retries, logging and alerting, backups and cleanup jobs, file watchers and glue between tools. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when a real part of the task lies in this field; it can load beside another companion.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Automation

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**A job that runs without anyone watching must be safe to run twice, must say when it fails, and must have a dry-run mode.** Run it once by hand in the real environment before scheduling it. A job that deletes or sends is an outward step under the core's rule 2 unless the user named it.

## What saves the most time

- **`set -euo pipefail` and quoting** in bash. Quote every expansion: `"$file"`, `"${args[@]}"`.
- **Absolute paths.** Cron's `PATH` and working directory are minimal; set `PATH` in the script and `cd` to a known directory with a check.
- **Log with timestamps to a known file**, one line per step, so the morning after has an answer.
- **Exit codes that mean something**: 0 for done, non-zero for every failure, never swallowed by a trailing `echo`.
- **`flock -n` against overlap.** A slow run must not collide with the next one.
- **Run it as the scheduler would**: `env -i HOME="$HOME" PATH=/usr/bin:/bin /path/to/job.sh` shows what the bare environment breaks.

## Scheduling

- **cron**: `m h dom mon dow command`. A bare `%` in a crontab line is a newline; escape it as `\%`. Set `MAILTO=` or redirect output, or mail piles up or vanishes. Cron runs in the system time zone unless `CRON_TZ` is supported and set.
- **systemd timers**: a `.service` plus a `.timer` with `OnCalendar=` and `Persistent=true` to catch runs missed while off. Check with `systemctl list-timers` and read output with `journalctl -u name.service`.
- **Windows Task Scheduler**: `Register-ScheduledTask` with an action, trigger and principal; set "run whether user is logged on or not" and a start-in directory. Check `Get-ScheduledTaskInfo` for `LastTaskResult`.

## Making it safe

- **Idempotence**: the second run finds the work done and does nothing. Check state before acting; use markers or upserts.
- **Temp files** from `mktemp`, removed by `trap 'rm -rf "$tmp"' EXIT`.
- **Atomic writes**: write to a temp file in the same directory, then `mv` it over the target.
- **`--dry-run`** prints every change it would make and makes none. Make it the first mode run.
- **Confirm the target before any delete**: refuse an empty or root path (`${dir:?}`), check it exists and is the expected directory.
- **Retention by age**: print the list with `find "$dir" -type f -mtime +30 -print` first; delete only after the list is seen.

## Failing loudly

- Non-zero exit on every failure; the scheduler and the monitor only see the exit code.
- Alert on failure and on silence: a heartbeat ping at the end of a good run (a dead-man's switch) catches the job that never started.
- Retries with backoff for network steps only, with a limit; a retry loop must not hide a permanent error.
- Rotate logs (`logrotate` or `journald`) so a job does not fill the disk.

## Backups

- A backup is proven only by a restore. Schedule a restore test, not just the backup.
- 3-2-1: three copies, two kinds of media, one off-site.
- Record checksums (`sha256sum`) at write time and verify them at copy and restore time.
- Retention is part of the job: keep N daily, weekly and monthly, pruned by the same dry-run-first rule.

## Working with tools and other skills

- Pair up when part of the job lies in another field: `hanahira-claude-ui-remote` for running on servers, `hanahira-claude-ui-windows` for Task Scheduler and PowerShell, `hanahira-claude-ui-data` for database backups, `hanahira-claude-ui-devops` for jobs scheduled in CI.
- A recurring task for Claude itself (a check every morning, a re-run on a timer) is the session's own scheduling skill (`schedule` or `loop` where the session lists one), not a cron job that starts `claude`.
- Helpers checking separate jobs or hosts follow `references/agents.md` in the core.

Script skeletons and pitfalls in bash and Python: `references/scripts.md`. Cron, systemd and Task Scheduler examples, monitoring, log rotation and backup jobs: `references/scheduling-and-ops.md`.
