// Mirrors "version" in .claude-plugin/plugin.json. A hooks module may only import code
// files, so it cannot read the JSON; scripts/repo.spec.ts keeps the two equal.
export const VERSION = '1.13.0'
// Which copy's skills this band goes with: scripts/install-ssh.sh sets 'SSH' in the copy it
// installs on an SSH host with the skills; the published copy says 'Account'.
export const SKILLS_FROM: 'Account' | 'SSH' = 'Account'
