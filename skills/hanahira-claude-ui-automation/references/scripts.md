# Scripts

A look-up for writing a script that runs unattended: a bash skeleton, the bash pitfalls that bite most, a Python skeleton, and how to choose between them.

## Bash skeleton

```bash
#!/usr/bin/env bash
set -Eeuo pipefail   # -E: the ERR trap below also fires inside functions
IFS=$'\n\t'
PATH=/usr/local/bin:/usr/bin:/bin

usage() { echo "usage: $0 [--dry-run] TARGET_DIR" >&2; exit "${1:-2}"; }

DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage 0 ;;
    -*) echo "unknown option: $1" >&2; usage ;;
    *) break ;;
  esac
done
[[ $# -eq 1 ]] || usage
TARGET="${1:?}"
[[ -d "$TARGET" ]] || { echo "not a directory: $TARGET" >&2; exit 1; }

LOG="${LOG:-/var/log/myjob.log}"   # a path the job's user can write
log() { printf '%s %s\n' "$(date -Is)" "$*" | tee -a "$LOG" >&2; }
# `local IFS=' '`: "$*" joins with IFS's first character, a newline above, which would split one step over several log lines.
run() { local IFS=' '; if (( DRY_RUN )); then log "DRY: $*"; else log "RUN: $*"; "$@"; fi; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
trap 'log "failed at line $LINENO"' ERR

log "start target=$TARGET dry_run=$DRY_RUN"
run cp -a "$TARGET/data.csv" "$tmp/"
log "done"
```

- `run` wraps every changing step, so `--dry-run` covers all of them. Exit 2 for bad usage, 1 for failure.

## Bash pitfalls

- **Word splitting**: unquoted `$var` splits on spaces and expands globs. Quote it; use arrays for argument lists: `args=(-a --delete); rsync "${args[@]}" "$src" "$dst"`.
- **Globbing with no match** leaves the pattern literal. Set `shopt -s nullglob` before `for f in "$dir"/*.log`.
- **`cd` without a check** runs the rest in the wrong place. Write `cd "$dir" || exit 1` (or rely on `set -e`, and still never `cd` into an unchecked variable).
- **`set -e` gaps**: it does not fire inside `if`, `&&`, `||`, or a function called from them; `local x=$(cmd)` masks the status. Declare then assign.
- **Pipelines** hide failures without `pipefail`.
- **Parsing `ls`** breaks on odd names. Use `find ... -print0 | xargs -0` or a glob.
- **Paths starting with `-`** look like options. Pass `--` before them, or prefix with `./`.

## Python skeleton

```python
#!/usr/bin/env python3
import argparse, logging, os, subprocess, sys
from pathlib import Path

log = logging.getLogger("myjob")

def main() -> int:
    p = argparse.ArgumentParser(description="Copy reports.")
    p.add_argument("target", type=Path)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.FileHandler(os.environ.get("LOG", "/var/log/myjob.log")), logging.StreamHandler()])
    if not args.target.is_dir():
        log.error("not a directory: %s", args.target)
        return 1
    for f in sorted(args.target.glob("*.csv")):
        if f.with_name(f.name + ".gz").exists():
            continue
        cmd = ["gzip", "-k", str(f)]
        log.info("%s %s", "DRY" if args.dry_run else "RUN", cmd)
        if not args.dry_run:
            subprocess.run(cmd, check=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- Pass commands as lists, never `shell=True` with user input. `check=True` raises on non-zero exit; let it propagate to a non-zero exit code.
- Write files atomically: write `path.with_name(path.name + ".tmp")`, then `os.replace` it onto the target.

## Bash or Python

- **Bash** for gluing commands together: a few steps, mostly calling other tools, little logic.
- **Python** once there is real data handling, JSON or CSV, HTTP calls, retries with backoff, or more than about 100 lines.
- On Windows, PowerShell takes bash's place; keep the same skeleton: parameters, `$ErrorActionPreference = 'Stop'`, a log function, `-WhatIf` as the dry run.
